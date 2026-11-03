"use client";

import {
  AspectRatio,
  Box,
  Image,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextImage from "next/image";

import { LOGO_SRC } from "@/lib/branding";
import { EditableText } from "@/components/EditableText";
import { ReportFooter } from "@/components/ReportFooter";
import { ReportObservationCard } from "@/components/ReportObservationCard";
import { usePhotoUrls } from "@/hooks/usePhotoUrls";
import { formatReportDate } from "@/lib/formatDate";
import type { ObservationForm, ObservationPhoto, RecordedItem } from "@/types";

type ReportPreviewProps = {
  projectNumber: string;
  projectName?: string;
  form: ObservationForm;
  photos: ObservationPhoto[];
  causes: RecordedItem[];
  actions: RecordedItem[];
  /** Provide the three edit callbacks to make the report editable. Omitting
   *  them renders a read-only record, which is what the saved report needs. */
  onObservationChange?: (value: string) => void;
  onCauseChange?: (id: string, text: string) => void;
  onActionChange?: (id: string, text: string) => void;
};

/**
 * The commissioning field observation report.
 *
 * Styling intent: a white document with thin grey rules and a single red
 * accent - what an engineering field report looks like. No dark sidebars, no
 * boilerplate footer language, nothing that reads as generated.
 *
 * `data-print="document"` lets the print stylesheet strip the on-screen card
 * so the browser's own Print-to-PDF produces something usable today, ahead of
 * real PDF generation.
 */
export function ReportPreview({
  projectNumber,
  projectName,
  form,
  photos,
  causes,
  actions,
  onObservationChange,
  onCauseChange,
  onActionChange,
}: ReportPreviewProps) {
  const photoUrls = usePhotoUrls(
    projectNumber,
    photos.map((photo) => photo.blobPath),
  );

  return (
    <Box
      data-print="document"
      bg="white"
      borderWidth="1px"
      borderColor="line"
      borderRadius="md"
      px={{ base: 4, md: 10 }}
      py={{ base: 6, md: 10 }}
    >
      <Stack gap={{ base: 6, md: 8 }}>
        {/* Header */}
        <Stack gap="4">
          <Stack
            data-print-layout="header"
            direction={{ base: "column", sm: "row" }}
            justify="space-between"
            align={{ base: "flex-start", sm: "flex-end" }}
            gap="3"
          >
            <NextImage
              src={LOGO_SRC}
              alt="Parkhill"
              width={232}
              height={40}
              style={{ height: "2rem", width: "auto" }}
            />
            <Text
              fontSize={{ base: "sm", md: "md" }}
              fontWeight="semibold"
              letterSpacing="wide"
              textTransform="uppercase"
              color="fg"
            >
              Field Observation
            </Text>
          </Stack>
          <Box borderBottomWidth="2px" borderColor="brand.solid" />
        </Stack>

        {/* Identifying information */}
        <SimpleGrid
          data-print-layout="grid-3"
          columns={{ base: 1, sm: 2, md: 3 }}
          gapX="8"
          gapY="4"
        >
          <ReportField
            label="Project"
            value={
              projectName ? `${projectNumber} — ${projectName}` : projectNumber
            }
          />
          <ReportField label="Equipment" value={form.equipment} />
          <ReportField label="System" value={form.system} />
          <ReportField label="Location" value={form.location || "—"} />
          <ReportField label="Activity / Test" value={form.activity} />
          <ReportField label="Date" value={form.observedDate} isDate />
        </SimpleGrid>

        <ReportSection title="Field Observation">
          <ReportObservationCard
            equipment={form.equipment}
            observedDate={form.observedDate}
            observation={form.observation}
            onObservationChange={onObservationChange}
          />
        </ReportSection>

        {photos.length > 0 && (
          <ReportSection title="Field Photos">
            <SimpleGrid data-print-layout="grid-2" columns={{ base: 1, sm: 2 }} gap="4">
              {photos.map((photo) => (
                <Stack key={photo.id} gap="1.5" data-print="avoid-break">
                  <AspectRatio ratio={4 / 3}>
                    <Box
                      borderWidth="1px"
                      borderColor="line"
                      borderRadius="sm"
                      overflow="hidden"
                      bg="surface.muted"
                    >
                      {photoUrls[photo.blobPath] && (
                        <Image
                          src={photoUrls[photo.blobPath]}
                          alt={photo.fileName}
                          objectFit="contain"
                          width="full"
                          height="full"
                        />
                      )}
                    </Box>
                  </AspectRatio>
                  <Text fontSize="2xs" color="fg.subtle" truncate>
                    {photo.fileName}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>
          </ReportSection>
        )}

        <ReportSection title="Recommended Diagnostic Checks">
          <ReportItemList items={causes} onChange={onCauseChange} noun="diagnostic check" />
        </ReportSection>

        <ReportSection title="Suggested Corrective Actions">
          <ReportItemList
            items={actions}
            onChange={onActionChange}
            noun="corrective action"
          />
        </ReportSection>

        <ReportFooter>
          Parkhill · Field Observation · Project {projectNumber}
        </ReportFooter>
      </Stack>
    </Box>
  );
}

function ReportField({
  label,
  value,
  isDate = false,
}: {
  label: string;
  value: string;
  isDate?: boolean;
}) {
  return (
    <Stack gap="0.5" minW="0">
      <Text
        fontSize="2xs"
        fontWeight="bold"
        color="fg.muted"
        textTransform="uppercase"
        letterSpacing="wider"
      >
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {isDate ? formatReportDate(value) : value}
      </Text>
    </Stack>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="3">
      <Stack gap="1.5">
        <Text
          fontSize="sm"
          fontWeight="bold"
          textTransform="uppercase"
          letterSpacing="wide"
          color="fg"
        >
          {title}
        </Text>
        <Box borderBottomWidth="1px" borderColor="line" />
      </Stack>
      {children}
    </Stack>
  );
}

function ReportItemList({
  items,
  onChange,
  noun,
}: {
  items: RecordedItem[];
  onChange?: (id: string, text: string) => void;
  noun: string;
}) {
  if (items.length === 0) {
    return (
      <Text fontSize="sm" color="fg.muted">
        None selected.
      </Text>
    );
  }

  return (
    <Stack as="ol" gap="2.5" pl="5">
      {items.map((item) => (
        <Box as="li" key={item.id} data-print="avoid-break">
          {onChange ? (
            <EditableText
              value={item.text}
              onChange={(text) => onChange(item.id, text)}
              label={noun}
            />
          ) : (
            <Text fontSize="sm" lineHeight="tall">
              {item.text}
            </Text>
          )}
        </Box>
      ))}
    </Stack>
  );
}
