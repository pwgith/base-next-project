import { setupUserAndGetToken } from "../test/step-definitions/ifcTestHelpers";
import { writeFileSync } from "fs";

const email = process.argv[2];
const projectId = process.argv[3];

(async () => {
  const token = await setupUserAndGetToken(email);
  const res = await fetch(`http://localhost:3000/api/projects/${projectId}/ifc`, {
    headers: { Cookie: `sb_session=${token}` },
  });
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Length:", text.length);
  writeFileSync("output/debug-house.ifc", text);
  console.log("Saved to output/debug-house.ifc");
  process.exit(0);
})();
