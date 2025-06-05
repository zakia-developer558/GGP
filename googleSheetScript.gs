// Configuration
const API_ENDPOINT = 'https://your-api-domain.com/v1/sync-from-sheets'; // Replace with your actual API endpoint
const API_TOKEN = ''; // Your JWT token for authentication

// Trigger setup function - run this once to set up the trigger
function createSpreadsheetEditTrigger() {
  const sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(sheet)
    .onEdit()
    .create();
}

// Main function that runs when sheet is edited
function onSheetEdit(e) {
  try {
    // Get the active sheet
    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();
    
    // Only proceed if we're editing Sheet1 (modify this if you want to monitor different sheets)
    if (sheetName !== 'Sheet1') return;
    
    // Get the edited range
    const range = e.range;
    const row = range.getRow();
    
    // Skip header row
    if (row === 1) return;
    
    // Get the full row data
    const rowData = sheet.getRange(row, 1, 1, 18).getValues()[0]; // Assuming 18 columns as per your schema
    
    // Prepare the data for API
    const payload = {
      sheet: sheetName,
      row: rowData,
      data: [rowData] // Wrapping in array as per your API expectation
    };
    
    // Make the API call
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    // Send to your API endpoint
    const response = UrlFetchApp.fetch(API_ENDPOINT, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    // Log the result
    if (responseCode === 200) {
      Logger.log(`Successfully synced row ${row}`);
      // Optionally add a note to the cell to indicate successful sync
      range.setNote(`Last synced: ${new Date().toLocaleString()}`);
    } else {
      Logger.log(`Error syncing row ${row}: ${responseText}`);
      range.setNote(`Sync failed: ${new Date().toLocaleString()} - ${responseText}`);
    }
    
  } catch (error) {
    Logger.log(`Error in onSheetEdit: ${error.toString()}`);
  }
}

// Function to manually sync all data
function syncAllData() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Get all data excluding header
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const data = values.slice(1); // Exclude header row
  
  // Prepare the payload
  const payload = {
    sheet: sheetName,
    data: data
  };
  
  // Make the API call
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(API_ENDPOINT, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('Successfully synced all data');
      SpreadsheetApp.getActiveSpreadsheet().toast('All data synced successfully!');
    } else {
      Logger.log(`Error syncing data: ${response.getContentText()}`);
      SpreadsheetApp.getActiveSpreadsheet().toast('Error syncing data. Check logs for details.');
    }
  } catch (error) {
    Logger.log(`Error in syncAllData: ${error.toString()}`);
    SpreadsheetApp.getActiveSpreadsheet().toast('Error syncing data. Check logs for details.');
  }
}

// Function to test the connection
function testConnection() {
  try {
    const options = {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(API_ENDPOINT.replace('/sync-from-sheets', '/health'), options);
    Logger.log(`Connection test response: ${response.getResponseCode()} - ${response.getContentText()}`);
    SpreadsheetApp.getActiveSpreadsheet().toast(`Connection test: ${response.getResponseCode() === 200 ? 'Success' : 'Failed'}`);
  } catch (error) {
    Logger.log(`Connection test error: ${error.toString()}`);
    SpreadsheetApp.getActiveSpreadsheet().toast('Connection test failed. Check logs for details.');
  }
} 