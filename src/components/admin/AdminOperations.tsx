
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpeningTimes } from "@/components/admin/opening-times";

export const AdminOperations = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Garage Operations</h2>
      
      <Tabs defaultValue="opening-times">
        <TabsList>
          <TabsTrigger value="opening-times">Opening Times</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="opening-times" className="space-y-4 pt-4">
          <OpeningTimes />
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Operations</CardTitle>
              <CardDescription>
                Use with caution! These operations affect data across your garage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Data Export</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Export all your garage data in CSV format.
                </p>
                <Button variant="outline">Export Data</Button>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2 text-destructive">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">
                  These actions cannot be undone. Please be certain before proceeding.
                </p>
                <Button variant="destructive">Reset Database</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
