const shortlinkDomain =
  process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || "ukmfotografitelkom.com";
const shortlinkSubdomain =
  process.env.NEXT_PUBLIC_SHORTLINK_SUBDOMAIN || "link";

const localDomainPattern = /^(localhost|127\.0\.0\.1)(:\d+)?$/;
const shortlinkProtocol = localDomainPattern.test(shortlinkDomain)
  ? "http"
  : "https";

export const shortlinkHost = `${shortlinkSubdomain}.${shortlinkDomain}`;

export function buildShortlinkUrl(slug: string): string {
  return `${shortlinkProtocol}://${shortlinkHost}/${slug}`;
}
