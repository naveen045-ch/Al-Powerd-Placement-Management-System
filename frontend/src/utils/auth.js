const VALID_ROLES = [
  "ADMIN",
  "PLACEMENT_OFFICER",
  "RECRUITER",
  "STUDENT",
];

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = atob(payload);
    const bytes = Uint8Array.from(
      decoded,
      (char) => char.charCodeAt(0)
    );

    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {};
  }
}

function normalizeRoles(value) {
  if (!value) return [];

  const items = Array.isArray(value) ? value : [value];

  return items
    .map((item) => {
      if (typeof item === "string") return item;

      return (
        item?.authority ||
        item?.role ||
        item?.roleName ||
        item?.name ||
        ""
      );
    })
    .map((role) =>
      role.toUpperCase().replace(/^ROLE_/, "")
    )
    .filter((role) => VALID_ROLES.includes(role));
}

export function getUserRole(responseData, token) {
  const payload = decodeJwtPayload(token);

  const possibleRoles = [
    responseData?.role,
    responseData?.roles,
    responseData?.authorities,
    responseData?.user?.role,
    responseData?.user?.roles,
    responseData?.user?.authorities,
    payload?.role,
    payload?.roles,
    payload?.authorities,
    payload?.authority,
  ];

  for (const value of possibleRoles) {
    const roles = normalizeRoles(value);

    if (roles.includes("ADMIN")) return "ADMIN";
    if (roles.includes("PLACEMENT_OFFICER")) {
      return "PLACEMENT_OFFICER";
    }
    if (roles.includes("RECRUITER")) return "RECRUITER";
    if (roles.includes("STUDENT")) return "STUDENT";
  }

  return null;
}