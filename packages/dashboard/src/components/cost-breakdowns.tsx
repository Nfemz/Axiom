import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AgentCost {
  agentId: string;
  agentName: string;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  totalCost: number;
}

interface ModelCost {
  avgCostPerRequest: number;
  modelId: string;
  provider: string;
  requestCount: number;
  totalCost: number;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function AgentCostBreakdown({
  agentCosts,
}: {
  agentCosts: AgentCost[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-Agent Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Input Tokens</TableHead>
              <TableHead>Output Tokens</TableHead>
              <TableHead>Requests</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentCosts.map((agent) => (
              <TableRow key={agent.agentId}>
                <TableCell className="font-medium">{agent.agentName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(agent.totalCost)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTokens(agent.inputTokens)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatTokens(agent.outputTokens)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {agent.requestCount}
                </TableCell>
              </TableRow>
            ))}
            {agentCosts.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-12 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No cost data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ModelCostBreakdown({
  modelCosts,
}: {
  modelCosts: ModelCost[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-Model Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Requests</TableHead>
              <TableHead>Avg / Request</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelCosts.map((model) => (
              <TableRow key={model.modelId}>
                <TableCell className="font-medium">{model.modelId}</TableCell>
                <TableCell className="text-muted-foreground">
                  {model.provider}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(model.totalCost)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {model.requestCount}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(model.avgCostPerRequest)}
                </TableCell>
              </TableRow>
            ))}
            {modelCosts.length === 0 && (
              <TableRow>
                <TableCell
                  className="py-12 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No model cost data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
