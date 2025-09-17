import * as XLSX from "xlsx";

export const exportToExcel = (sheetsData, fileName) => {
  const workbook = XLSX.utils.book_new();

  for (const sheetName in sheetsData) {
    if (sheetsData.hasOwnProperty(sheetName)) {
      const worksheet = XLSX.utils.json_to_sheet(sheetsData[sheetName]);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  }

  XLSX.writeFile(workbook, fileName);
  console.log(`✅ Success! Data exported to ${fileName}`);
};