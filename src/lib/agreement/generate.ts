import { renderToBuffer } from "@react-pdf/renderer";
import { MembershipAgreement, type AgreementData } from "./template";

export type { AgreementData };

export async function generateAgreementPDF(data: AgreementData): Promise<Uint8Array> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = MembershipAgreement({ data }) as any;
  const buffer = await renderToBuffer(element);
  return new Uint8Array(buffer);
}
