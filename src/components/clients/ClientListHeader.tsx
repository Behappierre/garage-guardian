
import { ArrowUpDown, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SortField, SortDirection } from "./utils/sortingUtils";

interface ClientListHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

export const ClientListHeader = ({
  searchTerm,
  onSearchChange,
  sortField,
  sortDirection,
  onSort,
}: ClientListHeaderProps) => {
  // Get the sort direction icon for a field
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    return sortDirection === "asc"
      ? <ChevronUp className="h-4 w-4 text-primary" />
      : <ChevronDown className="h-4 w-4 text-primary" />;
  };

  return (
    <>
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Client List</h2>
      </div>
      
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients or vehicle registrations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col space-y-2">
          <p className="text-sm text-gray-500">Sort by:</p>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onSort("first_name")}
            >
              First Name {getSortIcon("first_name")}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onSort("last_name")}
            >
              Last Name {getSortIcon("last_name")}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onSort("created_at")}
            >
              Date Added {getSortIcon("created_at")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
