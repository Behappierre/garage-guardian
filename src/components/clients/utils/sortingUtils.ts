
export type SortField = "first_name" | "last_name" | "created_at";
export type SortDirection = "asc" | "desc";

interface SortableClient {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  [key: string]: any;
}

export const sortClients = <T extends SortableClient>(
  clients: T[] | undefined,
  sortField: SortField,
  sortDirection: SortDirection
): T[] | undefined => {
  if (!clients) return clients;
  
  return [...clients].sort((a, b) => {
    if (sortField === "first_name") {
      return sortDirection === "asc"
        ? a.first_name.localeCompare(b.first_name)
        : b.first_name.localeCompare(a.first_name);
    }
    if (sortField === "last_name") {
      return sortDirection === "asc"
        ? a.last_name.localeCompare(b.last_name)
        : b.last_name.localeCompare(a.last_name);
    }
    // Default: sort by created_at
    return sortDirection === "asc"
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};
