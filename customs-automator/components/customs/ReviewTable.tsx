"use client";

import type { LineItem } from "@/lib/schema";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface ReviewTableProps {
  items: LineItem[];
  onEdit: (path: string, newValue: string) => void;
}

const columns = [
  ["description", "Description"],
  ["hs_code_suggested", "HS code"],
  ["quantity", "Qty"],
  ["unit", "Unit"],
  ["unit_price", "Unit price"],
  ["total_value", "Value"],
  ["country_of_origin", "Origin"],
  ["weight_net_kg", "Net kg"],
  ["weight_gross_kg", "Gross kg"],
] as const;

export function ReviewTable({ items, onEdit }: ReviewTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Line</TableHead>
            {columns.map(([, label]) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
            <TableHead>Conf.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.line_number}>
              <TableCell className="font-mono text-xs">{item.line_number}</TableCell>
              {columns.map(([key]) => (
                <TableCell key={key} className="min-w-28">
                  <Input
                    defaultValue={String(item[key]?.value ?? "")}
                    onChange={(event) => onEdit(`items.${index}.${key}.value`, event.target.value)}
                    className="h-8 min-w-0"
                  />
                </TableCell>
              ))}
              <TableCell>
                <ConfidenceBadge confidence={item.hs_code_suggested.confidence} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
