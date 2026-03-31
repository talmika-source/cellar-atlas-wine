import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InfoCardProps = {
  title: string;
  description: string;
  value?: string;
  footer?: string;
};

export function InfoCard({ title, description, value, footer }: InfoCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardDescription>{description}</CardDescription>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {(value || footer) && (
        <CardContent className="space-y-2">
          {value ? <div className="text-3xl font-semibold">{value}</div> : null}
          {footer ? <p className="text-sm text-muted-foreground">{footer}</p> : null}
        </CardContent>
      )}
    </Card>
  );
}
