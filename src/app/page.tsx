import { Alert, Box, Button, Stack, Text } from "@chakra-ui/react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LuLogIn } from "react-icons/lu";

import { APP_NAME, LOGO_SRC } from "@/lib/branding";
import { safeReturnTo } from "@/lib/auth/relayState";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth/session";

/**
 * The sign-in page.
 *
 * Kept deliberately plain: a logo, what the application is, and one button.
 * An engineer opening this on a phone at a job site needs a single obvious
 * action, not a marketing page.
 */

/** Messages the SAML routes can redirect back with. */
const ERRORS: Record<string, string> = {
  not_configured:
    "Sign-in is not configured on this deployment yet. Contact Parkhill IT.",
  login_failed: "Sign-in could not be started. Please try again.",
  expired: "That sign-in attempt expired. Please try again.",
  bad_response: "The sign-in response could not be read. Please try again.",
  invalid_assertion:
    "The sign-in response could not be verified. Please try again, and contact Parkhill IT if it continues.",
  not_authorized: "This application is only available to Parkhill accounts.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const returnTo = safeReturnTo(single("returnTo"));

  // Already signed in - there is nothing to do on this page.
  if (session) {
    redirect(returnTo);
  }

  const errorKey = single("error");
  // `detail` carries the specific reason for a refusal (guest account, wrong
  // tenant), which is more useful than the generic line.
  const errorMessage = errorKey
    ? single("detail") || ERRORS[errorKey] || ERRORS.login_failed
    : undefined;
  const signedOut = single("signed_out") === "1";

  const signInHref = `/api/saml/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Box
      as="main"
      minH="100dvh"
      bg="white"
      display="flex"
      alignItems={{ base: "flex-start", md: "center" }}
      justifyContent="center"
      px={{ base: 5, md: 6 }}
      py={{ base: 12, md: 8 }}
    >
      <Stack gap={{ base: 8, md: 9 }} width="full" maxW="sm">
        <Stack gap="5">
          <Image
            src={LOGO_SRC}
            alt="Parkhill"
            width={232}
            height={40}
            priority
            style={{ height: "2rem", width: "auto" }}
          />
          <Stack gap="2">
            <Text fontSize="2xl" fontWeight="semibold" letterSpacing="-0.01em">
              {APP_NAME}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              Record a field observation, work through recommended diagnostic checks and
              corrective actions, and produce a commissioning field report.
            </Text>
          </Stack>
        </Stack>

        {errorMessage && (
          <Alert.Root status="error" size="sm">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        {signedOut && !errorMessage && (
          <Alert.Root status="success" size="sm">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>You have been signed out.</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Stack gap="3">
          <Button asChild colorPalette="brand" size="lg" width="full">
            {/*
              A plain link, not a form or a client component: sign-in is a
              top-level navigation to the identity provider, so this page needs
              no JavaScript to work at all.
            */}
            <Link href={signInHref} prefetch={false}>
              <LuLogIn />
              Sign in with your Parkhill account
            </Link>
          </Button>

          <Text fontSize="xs" color="fg.subtle">
            Access is limited to Parkhill staff accounts. Guest and external
            accounts cannot sign in.
          </Text>
        </Stack>
      </Stack>
    </Box>
  );
}
