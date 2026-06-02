import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";

export interface AgreementData {
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  propertyAddress: string;
  roomNumber: string;
  startDate: string;
  initialFee: number;
  monthlyFee: number;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)})${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.definitionRow}>
      <Text style={styles.definitionLabel}>{label}:</Text>
      <Text style={styles.definitionValue}>{value}</Text>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bullet}>{"●  "}{children}</Text>;
}

export function MembershipAgreement({ data }: { data: AgreementData }) {
  return (
    <Document>
      {/* ─── Pages 1-3: Main Agreement ─── */}
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Membership Agreement</Text>

        <Text style={styles.paragraph}>
          This Membership Agreement ("Agreement") is between the Member and the Company, listed below. This Agreement is effective as of the latest date it is executed by the Parties (the "Effective Date"), and comprises the entire contract and agreement between the Member and the Company (collectively the "Parties"). Member and Company agree as follows:
        </Text>

        {/* Section 1 — Definitions */}
        <Text style={styles.sectionHeading}>1. Definitions.</Text>
        <Text style={styles.paragraph}>The terms below shall have the following definitions:</Text>

        <Definition label="Member" value={data.memberName} />
        <Definition label="Member Email Address" value={data.memberEmail} />
        <Definition label="Member Phone" value={formatPhone(data.memberPhone)} />
        <Definition label="Company" value="Fruitful Management LLC or Assignee" />
        <Definition label="Property" value={data.propertyAddress} />
        <Definition label="Room #" value={data.roomNumber} />
        <Definition label="Management" value="Business entity assigned such role by Company, from time to time" />
        <Definition label="Company Membership Unit" value="One (1) membership unit, which is an economic interest only, non-voting unit of Company" />
        <Definition label="Start Date" value={data.startDate} />
        <Definition label="Initial Membership Fee" value={formatCurrency(data.initialFee)} />
        <Definition label="Monthly Membership Fee" value={formatCurrency(data.monthlyFee)} />
        <Definition label="Member Benefits" value="The benefits outlined upon Schedule A – Member Benefits" />
        <Definition label="Member Rules" value="The rules and disclosures outlined upon Schedule B – Member Rules" />

        {/* Section 2 — Nature */}
        <Text style={styles.sectionHeading}>2. Nature of This Agreement.</Text>
        <Text style={styles.paragraph}>
          This Agreement is not a lease. Instead, it is an agreement whereby Member obtains ownership of a single Company Membership Unit for a continuing payment obligation, which entitles Member to certain benefits, including access to designated areas within the Property and the Room, as long as Member fulfills the continuing obligations outlined within this Agreement. If Member fails to fulfill the continuing obligations outlined within this Agreement, Member's Company Membership Unit may be redeemed by Company and Member shall have no further rights to the Company Membership Unit, nor rights to access the Property or the Room. Member understands and agrees that this Agreement does not create a tenancy interest, a leasehold interest, or any other interest in the Property or the Room.
        </Text>

        {/* Section 3 — Payment */}
        <Text style={styles.sectionHeading}>3. Payment.</Text>
        <Text style={styles.paragraph}>
          In conjunction with the execution of this Agreement, Member shall pay both the Initial Membership Fee and the Monthly Membership Fee to Management. In exchange for payment of such fees, Member shall receive the Company Membership Unit (which is subject to redemption by Company, as further outlined herein). After payment of the Initial Membership Fee and the first Monthly Membership Fee, Member shall thereafter pay the Monthly Membership Fee to Management by the first day of each successive calendar month utilizing the payment instructions contained within the Member Rules. If Member makes payment of the Monthly Membership Fee after the fifth day of the calendar month, Member shall be required to pay a late fee of $15 or 5% of the Monthly Membership Fee, whichever is greater, in addition to the Monthly Membership Fee. Member acknowledges and agrees that Member shall not receive a physical Company Membership Unit, and that this Agreement, once executed, is the sole document that reflects Member's ownership of the Company Membership Unit (unless and until such Company Membership Unit is redeemed, in accordance with Section 4, herein).
        </Text>

        {/* Section 4 — Term and Redemption */}
        <Text style={styles.sectionHeading}>4. Term and Redemption.</Text>
        <Text style={styles.paragraph}>
          This Agreement shall become effective upon its execution by Member. Member's access to designated spaces within the Property and the Room shall begin upon the Start Date, and end upon the communication of an election to redeem Member's Company Membership Unit, as further outlined herein. As long as Member owns the Company Membership Unit, Member shall be entitled to access designated spaces within the Property and the Room. Member and Company agree to the following terms related to redemption of the Company Membership Unit:
        </Text>

        <View style={styles.indent}>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>a. Return of Company Membership Unit by Member. </Text>
            Member may elect to return his Company Membership Unit to Company through a redemption by submitting notice to Management utilizing the communication instructions contained within the Member Rules. Member shall provide Management with 60 days of advanced notice of Member's intent to return his Company Membership Unit, and Member shall continue to pay the Monthly Membership Fee during this 60-day period. Upon the expiration of this 60-day period, Company shall be deemed to have immediately and instantaneously redeemed Member's Company Membership Unit. Immediately upon such redemption or upon Member's failure to make proper payment of the Monthly Membership Fee during the 60-day notice period, Member: (a) shall not be an owner of the Company Membership Unit; (b) shall cease to have the ability to access the Property and the Room; (c) shall cease to receive any Member Benefits; (d) shall cease to have any rights under this Agreement or any documents or agreements governing Company, and; (e) shall pay all monies due and owing to Company pursuant to the terms of this Agreement.
          </Text>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>b. Company's Redemption of Company Membership Unit. </Text>
            Company, by and through Management, may elect to redeem the Company Membership Unit from Member at any time, and for any reason, by sending notice of such election to Member via Member's Email Address or through other, similar, electronic means. Company's redemption of Member's Company Membership Unit shall take effect immediately upon transmittal of Company's redemption notice. Upon sending such notice, the redemption of Member's Company Membership Unit shall become effective immediately and Member shall thereafter cease to be an owner of the Company Membership Unit, cease to have the ability to access the Property and the Room; cease to receive any Member Benefits, and cease to have any rights under this Agreement or any documents or agreements governing Company. In the event Member dies or becomes incompetent while holding a Company Membership Unit, Member's death or incompetency shall immediately trigger an automatic redemption by Company of Member's Company Membership Unit, with no notice required to Member—such transfer, if triggered by Member's death, shall be considered a transfer to Company on death or "TOD" transfer. Member agrees and acknowledges that $1 shall be paid to Member as consideration for Member's Company Unit in the event such Company Unit is redeemed for any reason or no reason at all.
          </Text>
        </View>

        {/* Section 5 — Member Benefits */}
        <Text style={styles.sectionHeading}>5. Member Benefits.</Text>
        <Text style={styles.paragraph}>
          Company, by and through Management, may provide the Member Benefits outlined upon Schedule A, which is attached and incorporated herein. Member expressly agrees that Management may update and amend these Member Benefits from time to time as Company and Management see fit and in their sole discretion. If Company or Management amend the Member Benefits, Management shall communicate the amended Member Benefits to Member, and upon communication of such amended Member Benefits to Member, Member shall be bound by such amended Member Benefits and such amendment shall be automatically incorporated into this Agreement. Member acknowledges and agrees that Company owns all the furniture, and overall items in the property and its Units at the moment of the execution of this Membership Agreement and will not become the property of the Member. In the event that Company agrees, due to previous written request by Member, to provide any items and/or furniture for Member's Company Unit additional from any items and/or furniture that is already provided to Member per the terms of this Membership Agreement, such provision shall be made by Company only after Company receives the full amount of the overall move-in payment from Member, and Member acknowledges and agrees that such items and/or furniture will not become the property of the Member. Upon Member's departure from the Property, Member shall have no right or claim to any items and/or furniture provided by Company, and any and all items and/or furniture shall remain with the Property.
        </Text>

        {/* Section 6 — Compliance */}
        <Text style={styles.sectionHeading}>6. Compliance with Member Rules.</Text>
        <Text style={styles.paragraph}>
          Member shall comply with all Member Rules and review all disclosures outlined upon Schedule B, which is attached and incorporated herein. Member expressly agrees that Company or Management may update and amend these Member Rules from time to time as they see fit and in their sole discretion. If Company or Management amend the Member Rules, they shall communicate the amended Member Rules to Member, and upon Company's communication of such amended Member Rules to Member, Member shall be bound by such amended Member Rules and such amendment shall be automatically incorporated into this Agreement.
        </Text>

        {/* Section 7 — Confidentiality */}
        <Text style={styles.sectionHeading}>7. Confidentiality.</Text>
        <Text style={styles.paragraph}>
          After execution of this Agreement and in perpetuity thereafter, Member shall hold in strict confidence all of Company's Confidential Information, shall not disclose such information to anyone, and shall not use such information in any way that harms Company. "Confidential Information" shall mean any Company non-public information, including but not limited to lists of other Company members and their contact information and any non-public information provided to Member by Company or Management.
        </Text>

        {/* Section 8 — Indemnification */}
        <Text style={styles.sectionHeading}>8. Indemnification & Assumption of Risk.</Text>
        <Text style={styles.paragraph}>
          Member indemnifies, holds harmless, and agrees to defend Company and Management, including their subsidiaries, officers, managers, owners, employees, and contractors ("Indemnified Parties") from and against any third-party claims brought against Indemnified Parties that arise from Member's intentional or negligent conduct. Member assumes all risk, releases, and agrees not to bring claims against the Indemnified Parties for any claims for infection, injury, death, or damage of any kind caused by or related to COVID-19.
        </Text>

        {/* Section 9 — Limitation of Liability */}
        <Text style={styles.sectionHeading}>9. Limitation of Liability and Damages.</Text>
        <Text style={styles.paragraph}>
          Member agrees that Company's and Management's maximum liability for any action for breach of this Agreement or any action arising out of this Agreement—including but not limited to violation of any summary ejectment statute or unfair & deceptive trade practices act—shall be limited to the total amount of money paid by Member to Company or Management. Company and Management shall not be liable to Member for any indirect, incidental, punitive, or consequential damages whether arising in contract, warranty, or tort.
        </Text>

        {/* Section 10 — Assignment */}
        <Text style={styles.sectionHeading}>10. Assignment.</Text>
        <Text style={styles.paragraph}>
          Member shall not transfer or assign the Company Membership Unit or any rights under this Agreement to third parties. Company shall be entitled to assign all of its rights and responsibilities under this Agreement to third parties, at its sole discretion, and no notification to Member of such assignment shall be required.
        </Text>

        {/* Section 11 — Compliance with law */}
        <Text style={styles.sectionHeading}>11. Compliance with law.</Text>
        <Text style={styles.paragraph}>
          At all times, Member shall comply with all applicable federal, state, and local laws and ordinances. If Member learns of a violation of the law by Member, any of Member's guests, or any other member, Member shall immediately notify Management by utilizing the communication instructions contained within the Member Rules.
        </Text>

        {/* Section 12 — Arbitration */}
        <Text style={styles.sectionHeading}>12. Arbitration and Class Action Waiver.</Text>
        <Text style={styles.paragraph}>
          Any controversy or claim arising out of or relating to this Agreement, arising out of or relating to Member's relationship with Company or Management, or arising out of or relating to Member's use of the Property or the Room shall be settled exclusively through binding arbitration administered by the American Arbitration Association in accordance with the Expedited Procedures of the Commercial Arbitration Rules. The arbitration hearing shall take place before a single arbitrator in Orange County, Florida, via video conference, and such arbitrator shall ensure the following procedural requirements govern the arbitration: the arbitration shall be decided based solely upon the submission of documents, and no witness testimony shall be elicited or heard; there shall be no written discovery, interrogatories, requests for production of documents, or requests for admissions; there shall be no depositions taken; all information exchanged and elicited through the arbitration shall be kept strictly confidential by the parties and shall not be shared with anyone other than the parties themselves and the arbitrator; and the arbitration hearing shall not exceed 1 day. Member agrees that Management is an intended beneficiary of this arbitration clause. This agreement to arbitrate shall be enforceable under and subject to the Federal Arbitration Act. In addition, no arbitration proceeding hereunder shall be filed or pursued as a class action or proceed as a class action, or on a basis involving claims brought in a purported representative capacity on behalf of the general public, other members or potential members or persons similarly situated. Moreover, no arbitration proceeding hereunder shall be consolidated with, or joined in any way with, any other arbitration proceeding.
        </Text>
        <Text style={styles.capsText}>
          THE PARTIES AGREE TO ARBITRATE ON AN INDIVIDUAL BASIS AND EACH WAIVES THE RIGHT TO PARTICIPATE IN A CLASS ACTION.
        </Text>

        {/* Section 13 — Force Majeure */}
        <Text style={styles.sectionHeading}>13. Force Majeure.</Text>
        <Text style={styles.paragraph}>
          Company and Management shall have no liability to Member under this Agreement if Company or Management is prevented from or delayed in its ability to perform its obligations under this Agreement by acts, events, omissions, or accidents beyond Company's reasonable control ("Force Majeure Events"). Force Majeure Events shall include, but not be limited to, the following: failure of a utility service or transport network, acts of God, war, riot, civil unrest or commotion, malicious damage, diseases or quarantine restrictions, compliance with any governmental order, rule, regulation, or direction, the occurrence of an accident, fire, flood, or storm.
        </Text>

        {/* Section 14 — Miscellaneous */}
        <Text style={styles.sectionHeading}>14. Miscellaneous.</Text>
        <Text style={styles.paragraph}>
          This Agreement is the entire understanding between the parties and supersedes all previous agreements. This Agreement shall not be changed unless such change is in writing and signed by the parties (excluding only Company and Management's ability to amend the Member Benefits and Member Rules through the procedures outlined herein). North Carolina law governs this Agreement, without regard to conflict of law principles, and any disputes arising under or related to this Agreement shall be resolved in (County), (State), in accordance with the terms of Section 12, outlined herein. Waiver of a breach of this Agreement or failure to enforce this Agreement on one or more occasions shall not be construed as a waiver of any subsequent breach. Before signing, all parties had an opportunity to review this Agreement with counsel and request any changes. Any ambiguity found in this Agreement shall not be construed against the drafter. If any portion of this Agreement is found to be invalid, then the remaining, valid portions of the Agreement shall still be enforceable.
        </Text>

        {/* ─── Signature Block ─── */}
        <View style={styles.signatureBlock}>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>Member's Name:</Text>
            <Text style={[styles.signatureLabel, styles.bold]}>{data.memberName}</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.signatureLabel}>Signature</Text>
              <View style={styles.signatureLine} />
            </View>
            <View style={{ marginTop: 4 }}>
              <Text style={styles.signatureLabel}>Date</Text>
              <View style={styles.signatureLine} />
            </View>
          </View>

          <View style={styles.signatureColumn}>
            <Text style={styles.signatureLabel}>Company's Name:</Text>
            <Text style={[styles.signatureLabel, styles.bold]}>Fruitful Management LLC</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.signatureLabel}>Signature by Jimmy Fuentes its Manager</Text>
              <View style={styles.signatureLine} />
            </View>
            <View style={{ marginTop: 4 }}>
              <Text style={styles.signatureLabel}>Date</Text>
              <View style={styles.signatureLine} />
            </View>
          </View>
        </View>
      </Page>

      {/* ─── Schedule A ─── */}
      <Page size="LETTER" style={styles.page} break>
        <Text style={styles.scheduleTitle}>SCHEDULE A 1/1</Text>
        <Text style={styles.scheduleSubtitle}>Member Benefits</Text>

        <Bullet>Furnished common areas within the Property.</Bullet>
        <Bullet>Monthly cleaning of Property common areas, kitchen, and shared bathrooms.</Bullet>
        <Bullet>Unlimited high-speed internet.</Bullet>
        <Bullet>No utility deposits.</Bullet>
        <Bullet>Free lawn care, maintenance, and pest control.</Bullet>
        <Bullet>24/7 security camera monitoring of exterior of Property.</Bullet>
        <Bullet>Free business hours lock-out service.</Bullet>
        <Bullet>1 free transfer to a new room or Property, upon availability.</Bullet>
        <Bullet>Access to other properties, as long as a Member remains compliant with all obligations under this Agreement.</Bullet>
      </Page>

      {/* ─── Schedule B — Page 1 ─── */}
      <Page size="LETTER" style={styles.page} break>
        <Text style={styles.scheduleTitle}>SCHEDULE B 1/2</Text>
        <Text style={styles.scheduleSubtitle}>Member Rules & Disclosures</Text>

        <Text style={styles.subHeading}>Cleanliness</Text>
        <Bullet>No smoking or vaping of any kind inside or on the Property.</Bullet>
        <Bullet>No pets of any kind (excluding only service animals that support Member with a disability, after provision of appropriate and requested documentation).</Bullet>
        <Bullet>Member shall keep the Property and Room clean and free from noxious odors.</Bullet>
        <Bullet>Member shall participate in the "SWAT" Member cleaning rotation (there is no explanation or Schedule X explaining the terms of the SWAT, or in the alternative, Member shall elect to pay an additional $50 per month to opt out of the SWAT policy.</Bullet>
        <Bullet>If cleaning that exceeds regular and normal levels is required to be performed by Management due to Member's action or inaction, then, in Management's sole discretion, the cost for such excess cleaning shall be paid by Member.</Bullet>
        <Bullet>Member shall not flush any items other than toilet paper down the toilet. If Member violates this rule, Management may, in Management's sole discretion, charge the cost for remediating any resulting plumbing issues to Member.</Bullet>
        <Bullet>Common areas are to be free of any personal belongings. The Member agrees to keep personal items in their designated labeled space or in their bedroom.</Bullet>

        <Text style={styles.subHeading}>Maintenance</Text>
        <Bullet>If Member causes any damage or creates an unclean state within the Property or Room, Member shall be responsible for reimbursing Company or Management for an expenditures to remediate such damage or uncleanliness.</Bullet>
        <Bullet>Member shall immediately notify Management if any maintenance or repairs are necessary to Property or to Member's Room. Such notification shall be made only via Apartments.com portal.</Bullet>

        <Text style={styles.subHeading}>Kindness</Text>
        <Bullet>Member agrees to treat other members and representatives of Company and Management with kindness and respect.</Bullet>
        <Bullet>Member agrees not to take or steal items or property that belongs to other members, Company, or Management, including but not limited to food, furniture, fixtures, and other items.</Bullet>

        <Text style={styles.subHeading}>Vehicles & Parking</Text>
        <Bullet>Vehicles must be parked in the driveway or designated parking spot. Parking on the lawn is not allowed by Member. If found in violation, Member shall be responsible for paying the fee for damage done to Property.</Bullet>

        <Text style={styles.subHeading}>Noise</Text>
        <Bullet>Quiet hours are as follows: 10 pm-7 am Mon-Thurs and 11 pm-8 am Fri-Sun. Please keep noise at a minimum during quiet hours. Use headphones, keep common area interactions at a minimum, and be respectful of other members. If Member violates such requirement, such violation shall result in a warning for the first violation and appropriate action by Management upon the second violation.</Bullet>

        <Text style={styles.subHeading}>Guests</Text>
        <Bullet>Member is allowed 5 overnight guests per month.</Bullet>
      </Page>

      {/* ─── Schedule B — Page 2 ─── */}
      <Page size="LETTER" style={styles.page} break>
        <Text style={styles.scheduleTitle}>SCHEDULE B 2/2</Text>
        <Text style={styles.scheduleSubtitle}>Member Rules & Disclosures</Text>

        <Text style={styles.subHeading}>Health & Safety</Text>
        <Bullet>Firearms are not allowed on the premises.</Bullet>
        <Bullet>Member shall not harass, bully, or disrespect another member, a vendor, or anyone from Company or Management.</Bullet>
        <Bullet>Smoking in or on the Property is not allowed.</Bullet>

        <Text style={styles.subHeading}>Communication with Management & Member's Payment</Text>
        <Bullet>Member shall send all communications to Company and Management by and through email, at team@fruitfulmgmt.com</Bullet>
        <Bullet>Member shall pay all monies owed to Management by and through Apartments.com portal.</Bullet>

        <Text style={styles.subHeading}>Lead-Based Paint Disclosure</Text>
        <Text style={styles.paragraph}>
          Member understands that Housing built before 1978 may contain lead-based paint. Lead from paint, paint chips, and dust can pose health hazards if not taken care of properly. Lead exposure is especially harmful to young children and pregnant women. Before allowing access to pre-1978 housing, those who access such properties must have been provided a disclosure of the presence of known lead-based paint and/or lead-based paint hazards. Those who access such properties must also receive a federally approved pamphlet on lead poisoning prevention.
        </Text>
        <Text style={styles.paragraph}>
          Here, Company represents that the Property and Room have no known lead-based paint and/or lead-based paint hazards. In addition, Company represents that Company has no reports or records pertaining to lead-based paint and/or lead-based paint hazards within the Property or Room.
        </Text>
        <Text style={styles.paragraph}>
          Member acknowledges that Member received the pamphlet, Protect Your Family from Lead in Your Home. Company and Management are aware and have properly notified the Property's owner of all obligations under 42 U.S.C. 4852(d) and the Property's owner is aware of the responsibility to ensure compliance. Company and Management certify, to the best of their knowledge, that the information provided within this Lead-Based Paint Disclosure is true and accurate.
        </Text>
      </Page>
    </Document>
  );
}
