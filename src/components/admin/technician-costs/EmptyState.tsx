
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const EmptyState = () => {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">No Technicians Found</CardTitle>
        <CardDescription>
          There are no technicians associated with this garage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Add technicians to your garage to set their hourly rates.
        </p>
      </CardContent>
    </Card>
  );
};
