"use client";

import { Box, Stack, Table, Text } from "@chakra-ui/react";
import NextImage from "next/image";

import { ReportFooter } from "@/components/ReportFooter";
import { LOGO_SRC } from "@/lib/branding";
import { formatReportDate } from "@/lib/formatDate";
import type { RecordedItem, SavedObservation } from "@/types";

type ProjectReportProps = {
  projectNumber: string;
  projectName?: string;
  observations: SavedObservation[];
};

/**
 * The project-wide observation report: one table row per observation.
 *
 * Print-only. `data-print="only"` keeps it off screen, where the observation
 * list already shows the same records, and `data-print="landscape"` asks for a
 * landscape page, because ten columns do not fit across portrait paper.
 *
 * Rows are in the order the observations were made in the field, which is how
 * a report is read, rather than the newest-first order of the on-screen list.
 */
export function ProjectReport({
  projectNumber,
  projectName,
  observations,
}: ProjectReportProps) {
  const rows = [...observations].sort(
    (a, b) =>
      a.observedDate.localeCompare(b.observedDate) ||
      a.createdAt.localeCompare(b.createdAt),
  );

  const printedOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Box data-print="only">
      <Box data-print="landscape" width="full">
        <Stack gap="5" width="full">
          {/* Header */}
          <Stack gap="3">
            <Stack direction="row" justify="space-between" align="flex-end" gap="3">
              <NextImage
                src={LOGO_SRC}
                alt="Parkhill"
                width={250}
                height={85}
                style={{ height: "2rem", width: "auto" }}
              />
              <Text
                fontSize="md"
                fontWeight="semibold"
                letterSpacing="wide"
                textTransform="uppercase"
              >
                Field Observation Report
              </Text>
            </Stack>
            <Box borderBottomWidth="2px" borderColor="brand.solid" />
            <Stack direction="row" justify="space-between" gap="6" fontSize="sm">
              <Text fontWeight="medium">
                {projectName ? `${projectNumber} — ${projectName}` : projectNumber}
              </Text>
              <Text color="fg.muted">
                {rows.length} {rows.length === 1 ? "observation" : "observations"}
                {" · "}Printed {printedOn}
              </Text>
            </Stack>
          </Stack>

          <Table.Root size="sm" variant="outline" fontSize="xs" width="full">
            <Table.Header>
              <Table.Row>
                {COLUMNS.map((column) => (
                  <Table.ColumnHeader
                    key={column}
                    fontSize="2xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    color="fg.muted"
                    verticalAlign="bottom"
                  >
                    {column}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((observation, index) => (
                <Table.Row
                  key={observation.id}
                  data-print="avoid-break"
                  verticalAlign="top"
                >
                  <Table.Cell>{index + 1}</Table.Cell>
                  <Table.Cell whiteSpace="nowrap">
                    {formatReportDate(observation.observedDate)}
                  </Table.Cell>
                  <Table.Cell fontWeight="semibold">{observation.equipment}</Table.Cell>
                  <Table.Cell>{observation.system}</Table.Cell>
                  <Table.Cell>{observation.location || "—"}</Table.Cell>
                  <Table.Cell>{observation.activity}</Table.Cell>
                  <Table.Cell minW="10rem">{observation.observation}</Table.Cell>
                  <Table.Cell minW="10rem">
                    <ItemList items={observation.causes} />
                  </Table.Cell>
                  <Table.Cell minW="10rem">
                    <ItemList items={observation.actions} />
                  </Table.Cell>
                  <Table.Cell textAlign="center">{observation.photos.length}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          <ReportFooter>
            Parkhill · Field Observation Report · Project {projectNumber}
          </ReportFooter>
        </Stack>
      </Box>
    </Box>
  );
}

const COLUMNS = [
  "#",
  "Date",
  "Equipment",
  "System",
  "Location",
  "Activity / Test",
  "Observation",
  "Diagnostic checks",
  "Corrective actions",
  "Photos",
];

function ItemList({ items }: { items: RecordedItem[] }) {
  if (items.length === 0) {
    return <Text color="fg.muted">—</Text>;
  }

  return (
    <Stack as="ol" gap="1" pl="4" listStyleType="decimal">
      {items.map((item) => (
        <Box as="li" key={item.id}>
          {item.text}
        </Box>
      ))}
    </Stack>
  );
}
