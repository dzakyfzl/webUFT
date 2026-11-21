"""Executable access scenarios derived from PRD v1.6, without a database stub."""

from dataclasses import replace
import unittest

from app.permissions.policy import (
    Action, Actor, Grant, GrantSource, Membership, Period, Policy, Position,
    PositionAssignment, Program, Scope, ScopeType, Unit, UnitType,
)


class PolicyTest(unittest.TestCase):
    def setUp(self):
        self.units = (
            Unit("internal", "current", UnitType.DEPARTMENT),
            Unit("external", "current", UnitType.DEPARTMENT),
            Unit("hunting", "current", UnitType.DIVISION, "internal"),
            Unit("modeling", "current", UnitType.DIVISION, "internal"),
            Unit("hr", "current", UnitType.FUNCTION),
            Unit("old-internal", "old", UnitType.DEPARTMENT),
        )
        self.programs = (
            Program("a", "current", "internal", "chair-a"),
            Program("b", "current", "external", "chair-b"),
            Program("closed", "current", "internal", "chair-a", closed=True),
            Program("old-program", "old", "old-internal", "chair-a"),
            Program("hr-program", "current", "hr"),
        )
        self.policy = Policy(
            (Period("current"), Period("old", archived=True)), self.units, self.programs,
            (Grant("a", "chair-a", GrantSource.CHAIRPERSON, "a"),
             Grant("closed", "chair-a", GrantSource.CHAIRPERSON, "closed"),
             Grant("old-program", "chair-a", GrantSource.CHAIRPERSON, "old-program")),
        )
        self.member = Actor("member", True, frozenset({"current"}))
        self.hunting = replace(self.member, memberships=(Membership("hunting"),))
        self.chair = replace(self.member, user_id="chair-a")

    def officer(self, position=Position.CHAIR):
        return replace(self.member, positions=(PositionAssignment("current", position),))

    def test_all_twelve_inti_manage_accounts_but_do_not_get_program_edit(self):
        self.assertEqual(len(Position), 12)
        for position in Position:
            with self.subTest(position=position):
                actor = self.officer(position)
                self.assertTrue(self.policy.allows(actor, Action.MANAGE_ORGANIZATION))
                self.assertTrue(self.policy.allows(actor, Action.CREATE_PROGRAM, period_id="current"))
                self.assertTrue(self.policy.allows(actor, Action.CHANGE_CHAIRPERSON, program_id="a"))
                self.assertFalse(self.policy.allows(actor, Action.EDIT_PROGRAM, program_id="a"))
                self.assertFalse(self.policy.allows(actor, Action.MANAGE_COMMITTEE_STRUCTURE, program_id="a"))
                self.assertEqual(self.policy.allows(actor, Action.ARCHIVE_PERIOD, period_id="current"),
                                 position == Position.CHAIR)

    def test_non_inti_cannot_create_or_admin(self):
        for action in (Action.MANAGE_ORGANIZATION, Action.CREATE_PROGRAM,
                       Action.ARCHIVE_PERIOD):
            self.assertFalse(self.policy.allows(self.hunting, action, period_id="current"))

    def test_inheritance_is_upward_and_excludes_sibling(self):
        self.assertEqual(self.policy.effective_units(self.hunting, "current"),
                         frozenset({"hunting", "internal"}))
        parent = replace(self.member, memberships=(Membership("internal"),))
        self.assertEqual(self.policy.effective_units(parent, "current"), frozenset({"internal"}))
        self.assertTrue(self.policy.allows(self.hunting, Action.MANAGE_ASSIGNMENTS, program_id="a"))
        self.assertFalse(self.policy.allows(self.hunting, Action.MANAGE_ASSIGNMENTS, program_id="b"))

    def test_unit_scope_and_general_scope(self):
        cases = ((ScopeType.ORGANIZATION, None, True),
                 (ScopeType.DEPARTMENT, "internal", True),
                 (ScopeType.DEPARTMENT, "external", False),
                 (ScopeType.DIVISION, "hunting", True),
                 (ScopeType.DIVISION, "modeling", False),
                 (ScopeType.PROGRAM, "a", False))
        for kind, resource_id, expected in cases:
            with self.subTest(kind=kind, resource_id=resource_id):
                self.assertEqual(self.policy.allows(self.hunting, Action.EDIT_SCOPED_RECORD,
                                 scope=Scope(kind, "current", resource_id)), expected)

    def test_program_scope_never_inherits_department_edit(self):
        self.assertFalse(self.policy.allows(self.hunting, Action.EDIT_SCOPED_RECORD,
                         scope=Scope(ScopeType.PROGRAM, "current", "a")))
        self.assertTrue(self.policy.allows(self.chair, Action.EDIT_SCOPED_RECORD,
                        scope=Scope(ScopeType.PROGRAM, "current", "a")))
        self.assertFalse(self.policy.allows(self.chair, Action.EDIT_SCOPED_RECORD,
                         scope=Scope(ScopeType.PROGRAM, "old", "a")))

    def test_grants_are_program_specific_and_do_not_require_unit_membership(self):
        for source in GrantSource:
            with self.subTest(source=source):
                policy = replace(self.policy, grants=(Grant("a", "member", source, "source-1"),))
                self.assertTrue(policy.allows(self.member, Action.EDIT_PROGRAM, program_id="a"))
                self.assertFalse(policy.allows(self.member, Action.EDIT_PROGRAM, program_id="b"))
                self.assertFalse(policy.allows(self.member, Action.MANAGE_COMMITTEE_STRUCTURE, program_id="a"))
                self.assertFalse(policy.allows(self.member, Action.CLOSE_PROGRAM, program_id="a"))

    def test_inactive_grant_does_not_cancel_another_active_source(self):
        policy = replace(self.policy, grants=(
            Grant("a", "member", GrantSource.TASK_PIC, "task", active=False),
            Grant("a", "member", GrantSource.MANUAL, "manual"),
        ))
        self.assertTrue(policy.allows(self.member, Action.EDIT_PROGRAM, program_id="a"))
        policy = replace(policy, grants=(policy.grants[0],))
        self.assertFalse(policy.allows(self.member, Action.EDIT_PROGRAM, program_id="a"))

    def test_only_assigned_chair_of_this_program_manages_structure(self):
        self.assertTrue(self.policy.allows(self.chair, Action.MANAGE_COMMITTEE_STRUCTURE, program_id="a"))
        self.assertTrue(self.policy.allows(self.chair, Action.CLOSE_PROGRAM, program_id="a"))
        self.assertFalse(self.policy.allows(self.chair, Action.MANAGE_COMMITTEE_STRUCTURE, program_id="b"))
        without_grants = replace(self.policy, grants=())
        self.assertFalse(without_grants.allows(self.chair, Action.MANAGE_COMMITTEE_STRUCTURE, program_id="a"))

    def test_closed_and_archived_programs_deny_every_mutation(self):
        for program_id in ("closed", "old-program"):
            for action in (Action.EDIT_PROGRAM, Action.CLOSE_PROGRAM, Action.CHANGE_CHAIRPERSON,
                           Action.MANAGE_ASSIGNMENTS, Action.MANAGE_COMMITTEE_STRUCTURE):
                for actor in (self.chair, self.hunting, self.officer()):
                    with self.subTest(program=program_id, action=action, actor=actor.user_id):
                        self.assertFalse(self.policy.allows(actor, action, program_id=program_id))

    def test_archived_period_scopes_are_read_only(self):
        for kind, resource_id in ((ScopeType.ORGANIZATION, None),
                                  (ScopeType.DEPARTMENT, "old-internal"),
                                  (ScopeType.PROGRAM, "old-program")):
            self.assertFalse(self.policy.allows(self.officer(), Action.EDIT_SCOPED_RECORD,
                             scope=Scope(kind, "old", resource_id)))
        for action in (Action.ARCHIVE_PERIOD, Action.CREATE_PROGRAM):
            self.assertFalse(self.policy.allows(self.officer(), action, period_id="old"))

    def test_new_board_can_read_jejak_without_historical_roles(self):
        self.assertTrue(self.policy.allows(self.member, Action.READ_PROGRESS, period_id="old"))
        self.assertTrue(self.policy.allows(self.member, Action.READ_PROGRESS, program_id="old-program"))

    def test_historical_role_cannot_grant_current_administration(self):
        actor = replace(self.member, positions=(PositionAssignment("old", Position.CHAIR),))
        self.assertFalse(self.policy.allows(actor, Action.MANAGE_ORGANIZATION))
        actor = replace(actor, positions=actor.positions + (PositionAssignment("current", Position.HEAD_HR),))
        self.assertTrue(self.policy.allows(actor, Action.MANAGE_ORGANIZATION))

    def test_deactivation_applies_even_with_grants_and_roles(self):
        for actor in (replace(self.officer(), active=False), replace(self.chair, active=False),
                      replace(self.hunting, governing_period_ids=frozenset())):
            for action in Action:
                self.assertFalse(self.policy.allows(actor, action, period_id="current", program_id="a",
                                 scope=Scope(ScopeType.ORGANIZATION, "current")))

    def test_inactive_memberships_and_positions_give_no_rights(self):
        actor = replace(self.member, memberships=(Membership("hunting", active=False),),
                        positions=(PositionAssignment("current", Position.CHAIR, active=False),))
        self.assertEqual(self.policy.effective_units(actor, "current"), frozenset())
        self.assertFalse(self.policy.allows(actor, Action.MANAGE_ORGANIZATION))

    def test_unknown_actions_resources_and_malformed_scopes_deny(self):
        self.assertFalse(self.policy.allows(self.officer(), "UNKNOWN"))
        self.assertFalse(self.policy.allows(self.officer(), Action.EDIT_PROGRAM, program_id="missing"))
        for scope in (Scope(ScopeType.DEPARTMENT, "current", "hunting"),
                      Scope(ScopeType.ORGANIZATION, "current", "internal"),
                      Scope(ScopeType.DIVISION, "current", "missing")):
            self.assertFalse(self.policy.allows(self.hunting, Action.EDIT_SCOPED_RECORD, scope=scope))

    def test_hr_assignments_follow_approved_d02_inti_policy(self):
        self.assertTrue(self.policy.allows(self.officer(), Action.MANAGE_ASSIGNMENTS, program_id="hr-program"))
        self.assertFalse(self.policy.allows(self.member, Action.MANAGE_ASSIGNMENTS, program_id="hr-program"))

    def test_invalid_cross_period_relationships_are_rejected(self):
        with self.assertRaises(ValueError):
            replace(self.policy, units=self.units + (Unit("bad", "old", UnitType.DIVISION, "internal"),))
        with self.assertRaises(ValueError):
            replace(self.policy, programs=self.programs + (Program("bad", "old", "internal"),))
        with self.assertRaises(ValueError):
            replace(self.policy, units=self.units + (self.units[0],))


if __name__ == "__main__":
    unittest.main()
