"use client";

import { Box, Stack, Text } from "@chakra-ui/react";

/**
 * The closing footer of a printed report: a thin Parkhill-red rule and one
 * quiet line of identification.
 *
 * It is the last element of the document, not a per-page running footer.
 * Repeating a footer on every page needs `position: fixed` or CSS page-margin
 * boxes, and neither is dependable across the browsers engineers print from
 * (page-margin boxes, which is also how page numbers would work, are not
 * supported in Firefox or Safari). A closing footer prints identically
 * everywhere.
 */
export function ReportFooter({ children }: { children: React.ReactNode }) {
  return (
    <Stack data-print="avoid-break" gap="2" pt={{ base: 2, md: 4 }}>
      <Box borderBottomWidth="1px" borderColor="brand.solid" />
      <Text
        fontSize="2xs"
        color="fg.muted"
        textAlign="center"
        letterSpacing="wide"
      >
        {children}
      </Text>
    </Stack>
  );
}
