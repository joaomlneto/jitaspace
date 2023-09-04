// given a date, return the number of seconds until that date
// useful to compute Cache-Control's maxAge field from 'expires' headers
export function getTtlFromExpiresHeader(expirationDate: string): number {
  //console.log("expiration string", expirationDate);
  const now = new Date();
  const expiration = new Date(expirationDate);
  //console.log("expiration date", expiration);
  const ttl = Math.max(
    1,
    Math.ceil((expiration.getTime() - now.getTime()) / 1000),
  );
  //console.log("diff in seconds", ttl);
  return ttl;
}
