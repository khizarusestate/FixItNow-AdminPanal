import fs from "node:fs";

// Temporary one-shot migration script for the booking status filter UI.
const file = "src/Components/Bookings.jsx";
let source = fs.readFileSync(file, "utf8");

source = source.replace('label: "Approved",', 'label: "Pending",');
source = source.replace('label: "Claim Pending",', 'label: "Booking Claim Request",');

const statusConfigAnchor = '  "in-progress": {\n    color: "bg-blue-100 text-blue-700 border-blue-200",\n    icon: Loader2,\n    label: "In Progress",\n  },';
if (!source.includes(statusConfigAnchor)) throw new Error("STATUS_CONFIG in-progress block not found");
const onTheWayConfig = `  "on-the-way": {\n    color: "bg-orange-100 text-orange-700 border-orange-200",\n    icon: MapPin,\n    label: "On The Way",\n  },\n`;
if (!source.includes('"on-the-way": {')) source = source.replace(statusConfigAnchor, `${statusConfigAnchor}\n${onTheWayConfig}`);

source = source.replace('    completed: 0,\n  });', '    completed: 0,\n    onTheWay: 0,\n    inProgress: 0,\n  });');
source = source.replace('          "in-progress": 3,\n          completed: 4,', '          "on-the-way": 3,\n          "in-progress": 4,\n          completed: 5,');
source = source.replace('          rejected: 5,\n          cancelled: 6,', '          rejected: 6,\n          cancelled: 7,');

const oldStats = `          assigned: raw.workerAssigned ?? raw.assigned ?? 0,\n          rejected: raw.cancelled ?? raw.rejected ?? 0,\n          completed: raw.completed ?? 0,`;
const newStats = `          assigned: raw.workerAssigned ?? raw.assigned ?? 0,\n          onTheWay: raw.onTheWay ?? raw["on-the-way"] ?? raw.on_way ?? 0,\n          inProgress: raw.inProgress ?? raw["in-progress"] ?? 0,\n          rejected: raw.cancelled ?? raw.rejected ?? 0,\n          completed: raw.completed ?? 0,`;
if (!source.includes(oldStats)) throw new Error("Stats mapping block not found");
source = source.replace(oldStats, newStats);

const oldCards = `<div className="grid grid-cols-2 gap-4 lg:grid-cols-5">\n        <StatCard\n          title="Approved"`;
if (!source.includes(oldCards)) throw new Error("Booking status cards anchor not found");
source = source.replace(oldCards, `<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">\n        <StatCard\n          title="Pending"`);

const completedCard = `        <StatCard\n          title="Completed"`;
if (!source.includes(completedCard)) throw new Error("Completed card not found");
const onTheWayCard = `        <StatCard\n          title="On The Way"\n          value={stats.onTheWay}\n          icon={<MapPin size={18} />}\n          color="orange"\n          active={filterStatus === "on-the-way"}\n          onClick={() =>\n            setFilterStatus(\n              filterStatus === "on-the-way" ? "all" : "on-the-way",\n            )\n          }\n        />\n`;
const inProgressCard = `        <StatCard\n          title="In Progress"\n          value={stats.inProgress}\n          icon={<Loader2 size={18} />}\n          color="blue"\n          active={filterStatus === "in-progress"}\n          onClick={() =>\n            setFilterStatus(\n              filterStatus === "in-progress" ? "all" : "in-progress",\n            )\n          }\n        />\n`;
if (!source.includes('title="On The Way"')) source = source.replace(completedCard, `${onTheWayCard}${inProgressCard}${completedCard}`);

source = source.replace('title="Job Claim Request"', 'title="Booking Claim Request"');

fs.writeFileSync(file, source);
console.log("Booking status filters patched successfully.");
