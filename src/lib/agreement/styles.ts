import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontFamily: "Times-Roman",
    fontSize: 10,
    lineHeight: 1.4,
  },
  title: {
    fontSize: 16,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    textDecoration: "underline",
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    marginBottom: 8,
    textAlign: "justify",
  },
  bold: {
    fontFamily: "Times-Bold",
  },
  boldUnderline: {
    fontFamily: "Times-Bold",
    textDecoration: "underline",
  },
  indent: {
    paddingLeft: 30,
  },
  definitionRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  definitionLabel: {
    fontFamily: "Times-Bold",
    width: 180,
    fontSize: 10,
  },
  definitionValue: {
    fontFamily: "Times-Roman",
    flex: 1,
    fontSize: 10,
  },
  signatureBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signatureColumn: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    marginBottom: 4,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 6,
    height: 30,
  },
  scheduleTitle: {
    fontSize: 14,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 16,
  },
  bullet: {
    fontSize: 10,
    fontFamily: "Times-Roman",
    marginBottom: 4,
    paddingLeft: 15,
  },
  subHeading: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    textDecoration: "underline",
    marginTop: 12,
    marginBottom: 6,
  },
  capsText: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    textAlign: "justify",
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 60,
    right: 60,
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
});
