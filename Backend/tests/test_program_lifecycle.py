from dataclasses import replace
from datetime import date, datetime, timezone
import unittest

from app.permissions.policy import (
    Actor, Grant, GrantSource, Period, Policy, Position, PositionAssignment,
    Unit, UnitType,
)
from app.programs.lifecycle import CommandError, close_program, create_program


class ProgramLifecycleTest(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 17, tzinfo=timezone.utc)
        self.creator = Actor("creator", True, frozenset({"current"}), positions=(
            PositionAssignment("current", Position.HEAD_INTERNAL),))
        self.chair = Actor("chair", True, frozenset({"current"}))
        self.policy = Policy((Period("current"), Period("old", archived=True)), (
            Unit("internal", "current", UnitType.DEPARTMENT),
            Unit("external", "current", UnitType.DEPARTMENT),
            Unit("old-unit", "old", UnitType.DEPARTMENT),
        ))

    def create(self, **changes):
        kwargs = dict(policy=self.policy, actor=self.creator, program_id="a",
                      period_id="current", owner_unit_id="internal", name="Pameran",
                      description="Kegiatan UKM", chairperson_name="Ketua Pelaksana",
                      now=self.now, chairperson=self.chair,
                      starts_on=date(2026, 12, 1), ends_on=date(2026, 12, 2))
        kwargs.update(changes)
        return create_program(**kwargs)

    def close(self, created=None, **changes):
        created = created or self.create()
        policy = replace(self.policy, programs=(created.program.access,), grants=created.grants)
        kwargs = dict(policy=policy, actor=self.chair, record=created.program,
                      expected_version=1, unfinished_tasks=0,
                      confirmed_unfinished=False, now=self.now)
        kwargs.update(changes)
        return close_program(**kwargs)

    def assert_error(self, code, fn, **kwargs):
        with self.assertRaises(CommandError) as error:
            fn(**kwargs)
        self.assertEqual(error.exception.code, code)

    def test_create_direct_active_with_creator_and_chair_access_and_audit(self):
        change = self.create()
        self.assertFalse(change.program.access.closed)
        self.assertEqual(change.effective_assignees, {"creator", "chair"})
        self.assertEqual(change.program.version, 1)
        self.assertEqual(change.audit.actor_id, "creator")
        self.assertEqual(change.audit.occurred_at, self.now)
        self.assertEqual(change.audit.after_status, "ACTIVE")
        self.assertEqual(len(change.audit.grant_sources), 2)

    def test_same_creator_and_chair_has_one_effective_assignment_two_sources(self):
        change = self.create(chairperson=self.creator)
        self.assertEqual(change.effective_assignees, {"creator"})
        self.assertEqual({g.source for g in change.grants},
                         {GrantSource.CREATOR, GrantSource.CHAIRPERSON})

    def test_nonaccount_chair_does_not_create_a_user_or_grant(self):
        change = self.create(chairperson=None, chairperson_name="Panitia Nonakun")
        self.assertIsNone(change.program.access.chairperson_user_id)
        self.assertEqual(change.effective_assignees, {"creator"})
        self.assertEqual(change.program.chairperson_name, "Panitia Nonakun")

    def test_unauthorized_and_archived_creation_denied(self):
        self.assert_error("forbidden", self.create, actor=self.chair)
        self.assert_error("forbidden", self.create, period_id="old", owner_unit_id="old-unit")
        self.assert_error("forbidden", self.create, actor=replace(self.creator, active=False))

    def test_create_validates_names_dates_owner_chair_and_timestamp(self):
        invalid = ({"name": " "}, {"chairperson_name": ""},
                   {"ends_on": date(2026, 11, 1)}, {"owner_unit_id": "old-unit"},
                   {"chairperson": replace(self.chair, active=False)},
                   {"now": datetime(2026, 11, 17)})
        for changes in invalid:
            with self.subTest(changes=changes):
                self.assert_error("validation", self.create, **changes)

    def test_unknown_dates_are_optional(self):
        change = self.create(starts_on=None, ends_on=None)
        self.assertIsNone(change.program.starts_on)

    def test_duplicate_id_conflicts(self):
        policy = replace(self.policy, programs=(self.create().program.access,))
        self.assert_error("conflict", self.create, policy=policy)

    def test_unfinished_work_warns_but_can_be_closed_with_confirmation(self):
        self.assert_error("confirmation_required", self.close, unfinished_tasks=3)
        change = self.close(unfinished_tasks=3, confirmed_unfinished=True)
        self.assertTrue(change.program.access.closed)
        self.assertEqual(change.audit.unfinished_tasks, 3)
        self.assertEqual(change.audit.action, "program.closed")
        self.assertEqual(change.program.version, 2)

    def test_close_preserves_details_dates_creator_and_chair(self):
        created = self.create()
        closed = self.close(created)
        for field in ("name", "description", "chairperson_name", "created_by", "created_at",
                      "starts_on", "ends_on"):
            self.assertEqual(getattr(created.program, field), getattr(closed.program, field))
        self.assertEqual(created.program.access.chairperson_user_id,
                         closed.program.access.chairperson_user_id)
        self.assertEqual(created.program.access.closed, False)
        self.assertEqual(closed.program.closed_at, self.now)
        self.assertTrue(all(not g.active for g in closed.grants))

    def test_inti_can_close_without_assignment_but_regular_creator_cannot(self):
        self.assertTrue(self.close(actor=replace(self.creator, user_id="other-inti")).program.access.closed)
        actor = replace(self.creator, positions=())
        self.assert_error("forbidden", self.close, actor=actor)

    def test_other_program_chair_and_inactive_account_cannot_close(self):
        self.assert_error("forbidden", self.close, actor=replace(self.chair, user_id="another-chair"))
        self.assert_error("forbidden", self.close, actor=replace(self.chair, active=False))

    def test_version_and_archival_changes_are_rechecked(self):
        self.assert_error("conflict", self.close, expected_version=0)
        created = self.create()
        archived_policy = replace(self.policy, periods=(Period("current", archived=True), Period("old", archived=True)),
                                  programs=(created.program.access,), grants=created.grants)
        self.assert_error("forbidden", self.close, created=created, policy=archived_policy)
        stale_policy = replace(self.policy, programs=(replace(created.program.access, chairperson_user_id="new"),))
        self.assert_error("conflict", self.close, created=created, policy=stale_policy)

    def test_close_retry_is_noop_without_duplicate_audit(self):
        closed = self.close()
        policy = replace(self.policy, programs=(closed.program.access,), grants=closed.grants)
        retry = self.close(closed, policy=policy)
        self.assertEqual(retry.program, closed.program)
        self.assertIsNone(retry.audit)
        self.assertEqual(retry.grants, ())

    def test_closure_only_revokes_grants_of_this_program(self):
        created = self.create()
        other = self.create(program_id="b")
        policy = replace(self.policy, programs=(created.program.access, other.program.access),
                         grants=created.grants + other.grants)
        closed = self.close(created, policy=policy)
        self.assertTrue(all(g.program_id == "a" for g in closed.grants))
        self.assertTrue(all(g.active for g in other.grants))

    def test_invalid_unfinished_count_is_rejected(self):
        for value in (-1, True, "3", 0.5):
            with self.subTest(value=value):
                self.assert_error("validation", self.close, unfinished_tasks=value)


if __name__ == "__main__":
    unittest.main()
