
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface TimeEntriesListProps {
  jobTicketId: string;
}

export const TimeEntriesList = ({ jobTicketId }: TimeEntriesListProps) => {
  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["time_entries", jobTicketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          technician:profiles(first_name, last_name)
        `)
        .eq("job_ticket_id", jobTicketId)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div>Loading time entries...</div>;
  }

  if (!timeEntries?.length) {
    return <div className="text-gray-500 italic">No time entries recorded</div>;
  }

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "In progress";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / 1000 / 60);
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Technician</TableHead>
          <TableHead>Start Time</TableHead>
          <TableHead>End Time</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {timeEntries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              {entry.technician?.first_name} {entry.technician?.last_name}
            </TableCell>
            <TableCell>
              {format(new Date(entry.start_time), "MMM d, yyyy HH:mm")}
            </TableCell>
            <TableCell>
              {entry.end_time
                ? format(new Date(entry.end_time), "MMM d, yyyy HH:mm")
                : "In progress"}
            </TableCell>
            <TableCell>
              {formatDuration(entry.start_time, entry.end_time)}
            </TableCell>
            <TableCell>{entry.notes}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
