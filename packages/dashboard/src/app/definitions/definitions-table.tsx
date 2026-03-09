import { PencilIcon, TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Definition {
  createdAt?: string;
  defaultBudget?: number;
  id: string;
  mission?: string;
  model?: string;
  modelProvider?: string;
  name: string;
}

export function DefinitionsTable({
  definitions,
  onDelete,
}: {
  definitions: Definition[];
  onDelete: (id: string) => void;
}) {
  if (definitions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No definitions yet. Create one to get started.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Default Budget</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {definitions.map((definition) => (
          <DefinitionRow
            definition={definition}
            key={definition.id}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function DefinitionRow({
  definition,
  onDelete,
}: {
  definition: Definition;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{definition.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {definition.modelProvider
          ? `${definition.modelProvider}/${definition.model ?? "-"}`
          : (definition.model ?? "-")}
      </TableCell>
      <TableCell className="font-mono">
        {definition.defaultBudget != null
          ? `$${definition.defaultBudget.toFixed(2)}`
          : "-"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {definition.createdAt ?? "-"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            onClick={() => {
              /* TODO: Open edit form */
            }}
            size="sm"
            variant="outline"
          >
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(definition.id)}
            size="sm"
            variant="destructive"
          >
            <TrashIcon data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
