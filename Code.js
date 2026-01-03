// Configuration IDs
const SHEET_ID = 'ใส่ ID Google Sheet';
const DRIVE_FOLDER_ID = 'ใส่ ID Folder ใน Google Drive';

// --- ส่วนที่ 1: ฟังก์ชันหลักสำหรับแสดงผลหน้าเว็บ (doGet) ---
// ฟังก์ชันนี้จะทำงานเมื่อผู้ใช้เปิด URL ของ Web App
function doGet(e) {
  // สร้าง HTML Output จากไฟล์ชื่อ 'index' (คุณต้องตั้งชื่อไฟล์ HTML ใน Apps Script ว่า index.html)
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('ระบบสร้างจดหมายข่าวออนไลน์ - โรงเรียนครูเปิงมางfc') // ปรับชื่อ Title Bar เป็นโรงเรียนครูเปิงมางfc
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // อนุญาตให้ Embed หรือแสดงผลได้
      .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // รองรับการแสดงผลบนมือถือ
}

// --- ส่วนที่ 2: ฟังก์ชันสำหรับรับข้อมูลและบันทึก (doPost) ---
function doPost(e) {
  // Lock เพื่อป้องกันการบันทึกซ้อนกัน
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. บันทึกรูปภาพลง Google Drive
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    
    let mainImageUrl = "";
    if (data.mainImage) {
      const blob = Utilities.newBlob(Utilities.base64Decode(data.mainImage), data.mimeType || 'image/jpeg', "main_" + Date.now());
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      mainImageUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    }

    let galleryUrls = [];
    if (data.galleryImages && data.galleryImages.length > 0) {
      data.galleryImages.forEach((base64Str, index) => {
        if(base64Str) {
          const blob = Utilities.newBlob(Utilities.base64Decode(base64Str), data.mimeType || 'image/jpeg', "gallery_" + index + "_" + Date.now());
          const file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          galleryUrls.push("https://drive.google.com/uc?export=view&id=" + file.getId());
        }
      });
    }

    // 2. บันทึกข้อมูลลง Google Sheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheets()[0]; 
    
    // สร้าง Header ถ้ายังไม่มี
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Title", "Issue", "Date", "Content", "Footer", "Main Image URL", "Gallery URLs"]);
    }

    sheet.appendRow([
      new Date(),
      data.title,
      data.issue,
      data.date,
      data.content, 
      data.footer,
      mainImageUrl,
      galleryUrls.join(", ")
    ]);

    // ส่งค่ากลับเป็น JSON
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'mainImage': mainImageUrl }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  } finally {
    lock.releaseLock();
  }
}
