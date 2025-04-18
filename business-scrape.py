import requests
from bs4 import BeautifulSoup

# Function to fetch the company website URL from the COC page
def fetch_company_website(coc_url):
    try:
        response = requests.get(coc_url)
        if response.status_code != 200:
            return "Company website not available"
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Look for the company website URL (adjusted to search for class "card-link")
        website_element = soup.find("a", class_="card-link")
        if website_element and "href" in website_element.attrs:
            return website_element["href"]
        else:
            return "Company website not available"
    except Exception as e:
        return f"Error fetching website: {e}"

# Send request to the search page
url = "https://www.wilmingtonchamber.org/list/search?q=design&c=&sa=False"
response = requests.get(url)

# Check if the request was successful
if response.status_code != 200:
    print(f"Failed to retrieve the webpage. Status code: {response.status_code}")
    exit(1)

# Parse HTML response
soup = BeautifulSoup(response.content, "html.parser")

# Find all <h5> tags with the class "card-title"
business_listings = soup.find_all("h5", class_="card-title")

# Extract business information
businesses = []
for listing in business_listings:
    # Find the <a> tag inside the <h5>
    business_name_element = listing.find("a")
    if not business_name_element:
        print("Business name <a> tag not found. Skipping...")
        continue

    # Extract the business name and URL
    business_name = business_name_element.text.strip()
    business_link = business_name_element["href"]

    # Extract address and phone number
    parent_div = listing.find_parent("div", class_="gz-list-card-wrapper")
    if not parent_div:
        print(f"Parent div not found for {business_name}. Skipping...")
        continue

    # Extract address
    address = parent_div.find("li", class_="gz-card-address")
    if address:
        # Extract street address
        street_addresses = address.find_all("span", class_="gz-street-address")
        street_address_text = ", ".join([span.get_text(strip=True) for span in street_addresses])

        # Extract city, state, and zip
        city_state_zip = address.find("div", itemprop="citystatezip")
        if city_state_zip:
            city = city_state_zip.find("span", class_="gz-address-city")
            state = city_state_zip.find_all("span")[1] if len(city_state_zip.find_all("span")) > 1 else None
            zip_code = city_state_zip.find_all("span")[2] if len(city_state_zip.find_all("span")) > 2 else None

            city_text = city.get_text(strip=True) if city else "City not available"
            state_text = state.get_text(strip=True) if state else "State not available"
            zip_text = zip_code.get_text(strip=True) if zip_code else "Zip not available"

            address_text = f"{street_address_text}\n{city_text}, {state_text} {zip_text}"
        else:
            address_text = street_address_text  # Fallback if city/state/zip is missing
    else:
        address_text = "Address not available"

    # Extract phone number
    phone_element = parent_div.find("li", class_="gz-card-phone")
    if phone_element:
        phone_number = phone_element.find("a").text.strip()
    else:
        phone_number = "Phone number not available"

    # Fetch the actual company website URL
    company_website = fetch_company_website(business_link)

    # Append the extracted information to the list
    businesses.append({
        "Business Name": business_name,
        "Address": address_text,
        "Phone Number": phone_number,
        "Company Website": company_website
    })

# Write the extracted businesses to a new file
output_file = "businesses_output.txt"
with open(output_file, "w", encoding="utf-8") as file:
    for business in businesses:
        file.write(f"{business['Business Name']}\n")
        file.write(f"{business['Address']}\n")
        file.write(f"{business['Phone Number']}\n")
        file.write(f"{business['Company Website']}\n")
        file.write("\n")  # Add a blank line between entries

print(f"Business information has been written to {output_file}")
