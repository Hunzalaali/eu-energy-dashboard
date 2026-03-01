import csv
import os

base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
energy_path = os.path.join(base_dir, 'public', 'unified_eu_energy_data_clean.csv')
context_path = os.path.join(base_dir, 'public', 'eu27_final_contextual_cleaned.csv')
output_path = os.path.join(base_dir, 'public', 'unified_eu_energy_data_with_context.csv')

country_mapping = {
    'Austria': 'AT', 'Belgium': 'BE', 'Bulgaria': 'BG', 'Croatia': 'HR',
    'Cyprus': 'CY', 'Czechia': 'CZ', 'Denmark': 'DK', 'Estonia': 'EE',
    'Finland': 'FI', 'France': 'FR', 'Germany': 'DE', 'Greece': 'EL',
    'Hungary': 'HU', 'Ireland': 'IE', 'Italy': 'IT', 'Latvia': 'LV',
    'Lithuania': 'LT', 'Luxembourg': 'LU', 'Malta': 'MT', 'Netherlands': 'NL',
    'Poland': 'PL', 'Portugal': 'PT', 'Romania': 'RO', 'Slovakia': 'SK',
    'Slovenia': 'SI', 'Spain': 'ES', 'Sweden': 'SE'
}

# Read contexts
context_data = {}
with open(context_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        c_code = country_mapping.get(row['geo'])
        if not c_code:
            continue
        key = (c_code, row['TIME_PERIOD'])
        context_data[key] = {
            'gdp_pps': row['gdp_pps'],
            'mfg_share': row['mfg_share'],
            'urb_rate': row['urb_rate'],
            'hdd': row['hdd'],
            'pop_density': row['pop_density']
        }

# Merge and write
with open(energy_path, 'r', encoding='utf-8') as f_in, open(output_path, 'w', encoding='utf-8', newline='') as f_out:
    reader = csv.DictReader(f_in)
    fieldnames = reader.fieldnames + ['gdp_pps', 'mfg_share', 'urb_rate', 'hdd', 'pop_density']
    writer = csv.DictWriter(f_out, fieldnames=fieldnames)
    
    writer.writeheader()
    for row in reader:
        key = (row['country'], row['year'])
        if key in context_data:
            row.update(context_data[key])
        writer.writerow(row)

print(f"Merged data saved to {output_path}")
