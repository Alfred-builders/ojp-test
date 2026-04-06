import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Hr,
  Section,
  Img,
} from "@react-email/components";
import * as React from "react";

interface EmailWrapperProps {
  body: string;
}

export function EmailWrapper({ body }: EmailWrapperProps) {
  const lines = body.split("\n");

  return (
    <Html lang="fr">
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Img
              src="https://wprsfakodbuvszporcoe.supabase.co/storage/v1/object/public/assets/logo-light.png"
              width="180"
              alt="Or au Juste Prix"
              style={{ margin: "0 auto" }}
            />
          </Section>

          <Section style={contentStyle}>
            {lines.map((line, i) =>
              line.trim() === "" ? (
                <Text key={i} style={{ ...textStyle, height: "8px" }}>
                  &nbsp;
                </Text>
              ) : (
                <Text key={i} style={textStyle}>
                  {line}
                </Text>
              )
            )}
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              Or au Juste Prix — Achat, vente et dépôt-vente d&apos;or et bijoux
            </Text>
            <Text style={footerTextStyle}>
              Cet email a été envoyé automatiquement. Merci de ne pas y répondre directement.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  margin: 0,
  padding: "40px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  maxWidth: "580px",
  margin: "0 auto",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#18181b",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const contentStyle: React.CSSProperties = {
  padding: "32px",
};

const textStyle: React.CSSProperties = {
  color: "#18181b",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 4px 0",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#e4e4e7",
  margin: "0",
};

const footerStyle: React.CSSProperties = {
  padding: "20px 32px",
};

const footerTextStyle: React.CSSProperties = {
  color: "#a1a1aa",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "0 0 4px 0",
  textAlign: "center" as const,
};
