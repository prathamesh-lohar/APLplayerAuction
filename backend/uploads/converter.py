import os
import csv

def generate_file_list_csv(folder_path, output_csv):
    """
    Reads all files in a given folder and exports their details to a CSV.
    """
    # Check if the folder exists
    if not os.path.exists(folder_path):
        print(f"Error: The folder '{folder_path}' does not exist.")
        return

    # Open the CSV file in write mode
    with open(output_csv, mode='w', newline='', encoding='utf-8') as csv_file:
        writer = csv.writer(csv_file)
        
        # Write the header row
        writer.writerow(['File Name', 'Full Path', 'Size (Bytes)'])

        # Loop through all items in the specified directory
        for item in os.listdir(folder_path):
            full_path = os.path.join(folder_path, item)
            
            # Ensure we are only logging files, not subdirectories
            if os.path.isfile(full_path):
                file_size = os.path.getsize(full_path)
                
                # Write the file details to the CSV
                writer.writerow([item, full_path, file_size])
                
    print(f"Success! File list exported to: {output_csv}")

# ==========================================
# Configuration: Change these variables
# ==========================================
target_folder = '/Users/kantesh/Downloads/atom/IPL/APLplayerAuction/backend/uploads'            # Replace '.' with your folder path, e.g., 'C:/Users/Documents'
output_filename = 'files.csv'  # The name of the CSV file that will be created

# Run the function
if __name__ == '__main__':
    generate_file_list_csv(target_folder, output_filename)