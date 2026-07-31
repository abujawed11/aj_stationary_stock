import Badge from "./ui/Badge";

export default function StatusBadge({ active }) {
  return (
    <Badge tone={active ? "emerald" : "slate"}>{active ? "Active" : "Inactive"}</Badge>
  );
}
