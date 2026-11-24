export type DepartmentResult = {
  name: string;
  members: readonly { name: string; division?: string }[];
};

type SelectionAnnouncement = {
  period?: string;
  isDemo?: boolean;
  departments: readonly DepartmentResult[];
};

// Add only results approved for public release. Use one group per department.
const officialAnnouncement: SelectionAnnouncement = {
  departments: [],
};

const demoAnnouncement: SelectionAnnouncement = {
  isDemo: true,
  departments: [
    {
      name: "Departemen Internal",
      members: [
        { name: "Alya Sasmita", division: "Hunting" },
        { name: "Bima Nawasena", division: "Hunting" },
        { name: "Kirana Aksari", division: "Modeling" },
        { name: "Nara Baskara", division: "Modeling" },
        { name: "Tara Wisesa", division: "Hunting" },
      ],
    },
    {
      name: "Departemen Eksternal",
      members: [
        { name: "Aruna Pradipta", division: "Medkom" },
        { name: "Damar Adinata", division: "Public Relations" },
        { name: "Nala Maheswari", division: "Medkom" },
        { name: "Raka Abinaya", division: "Medkom" },
        { name: "Senja Ranadipa", division: "Public Relations" },
      ],
    },
    {
      name: "Departemen Asset dan Property",
      members: [
        { name: "Aksa Widyantara" },
        { name: "Dara Prameswari" },
        { name: "Galih Daneswara" },
        { name: "Laras Arunika" },
        { name: "Satria Dirgantara" },
      ],
    },
  ],
};

const showDemo = true;
export const selectionAnnouncement = showDemo ? demoAnnouncement : officialAnnouncement;
