import streamlit as st
import pandas as pd
import numpy as np

# Set page config
st.set_page_config(
    page_title="Table with Controlled-Size Form",
    layout="wide"
)

# Custom CSS for precise form size control
st.markdown("""
<style>
    /* Main form container with exact dimensions */
    div.row-widget.stForm {
        width: 350px !important;
        max-width: 350px !important;
        margin-left: 0 !important;
        padding: 15px !important;
        background-color: #1E1E1E !important;
        border: 1px solid #444 !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        border-left: 4px solid #FF4B4B !important;
        float: left !important;
    }
    
    /* Limit text area height strictly */
    div.row-widget.stForm textarea {
        min-height: 50px !important;
        height: 50px !important;
        max-height: 50px !important;
        resize: none !important;
    }
    
    /* Reduce input field height */
    div.row-widget.stForm input[type="text"],
    div.row-widget.stForm input[type="number"] {
        height: 30px !important;
        min-height: 30px !important;
        padding: 0 10px !important;
    }
    
    /* Decrease space between form elements */
    div.row-widget.stForm [data-testid="stVerticalBlock"] > div {
        padding-top: 0 !important;
        padding-bottom: 5px !important;
        margin-bottom: 0 !important;
    }
    
    /* Adjust button height */
    div.row-widget.stForm button {
        height: 30px !important;
        min-height: 30px !important;
        padding: 0 10px !important;
        line-height: 1 !important;
    }
    
    /* Custom title for the form */
    .form-title {
        font-size: 16px !important;
        font-weight: bold !important;
        margin-top: 0 !important;
        margin-bottom: 8px !important;
        color: white !important;
    }
    
    /* Target label sizes */
    div.row-widget.stForm label {
        font-size: 12px !important;
        margin-bottom: 2px !important;
    }
    
    /* Remove extra vertical spacing */
    div.row-widget.stForm [data-testid="stVerticalBlock"] {
        gap: 0 !important;
    }
    
    /* Style the form buttons */
    div.row-widget.stForm [data-testid="baseButton-secondary"] {
        background-color: #4CAF50 !important;
        color: white !important;
        border: none !important;
    }
    
    div.row-widget.stForm [data-testid="baseButton-secondary"]:nth-of-type(2) {
        background-color: #f44336 !important;
    }
    
    /* Hide form elements that add extra height */
    div.row-widget.stForm hr {
        display: none !important;
    }
    div.row-widget.stForm div:last-child {
        display: none !important;
    }
    
    /* Remove number input arrows for cleaner look */
    div.row-widget.stForm input[type="number"]::-webkit-inner-spin-button, 
    div.row-widget.stForm input[type="number"]::-webkit-outer-spin-button { 
        -webkit-appearance: none !important; 
        margin: 0 !important; 
    }
    
    /* Clear float after form */
    .form-clear {
        clear: both !important;
    }
    
    /* Custom form layout that forces square dimensions */
    .square-form-wrapper {
        width: 350px;
        float: left;
        margin-left: 10px;
    }
    
    /* Override Streamlit's default padding */
    div.element-container {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
    }
    
    /* Ensure the form column doesn't grow too large */
    div.stButton > button {
        width: auto !important;
    }
    
    /* Override column gaps */
    div.row-widget.stForm div.row-widget.stHorizontal {
        gap: 10px !important;
    }
</style>
""", unsafe_allow_html=True)

# Create sample data
def generate_sample_data(rows=10):
    data = {
        'ID': range(1, rows+1),
        'Name': [f"Stock {i}" for i in range(1, rows+1)],
        'Price': np.random.randint(100, 5000, size=rows),
        'Change': np.random.uniform(-5, 5, size=rows).round(2),
        'Volume': np.random.randint(1000, 1000000, size=rows)
    }
    return pd.DataFrame(data)

# Initialize session state
if 'selected_row' not in st.session_state:
    st.session_state.selected_row = None

if 'form_submitted' not in st.session_state:
    st.session_state.form_submitted = False

# Function to select a row
def select_row(row_id):
    if st.session_state.selected_row == row_id:
        # If clicking the same row again, toggle it off
        st.session_state.selected_row = None
    else:
        # Otherwise select the new row
        st.session_state.selected_row = row_id

# Function to handle form submission
def handle_submit():
    st.session_state.form_submitted = True
    st.session_state.selected_row = None  # Hide the form after submission

# Main layout
st.title("Table with Controlled-Size Form")

# Create a two-column layout for the main content
table_col, info_col = st.columns([3, 1])

# Generate sample data
df = generate_sample_data(15)

# Table column
with table_col:
    # Table header
    header_cols = st.columns([1, 2, 1.5, 1.5, 2, 1.5])
    with header_cols[0]:
        st.write("ID")
    with header_cols[1]:
        st.write("Name")
    with header_cols[2]:
        st.write("Price")
    with header_cols[3]:
        st.write("Change")
    with header_cols[4]:
        st.write("Volume")
    with header_cols[5]:
        st.write("Action")
    
    st.markdown("<hr>", unsafe_allow_html=True)
    
    # Display the table with action buttons
    for index, row in df.iterrows():
        # Create a container for this row
        row_container = st.container()
        with row_container:
            # Create columns for the row content
            row_cols = st.columns([1, 2, 1.5, 1.5, 2, 1.5])
            
            # Row data
            with row_cols[0]:
                st.write(row['ID'])
            with row_cols[1]:
                st.write(row['Name'])
            with row_cols[2]:
                st.write(f"₹{row['Price']}")
            with row_cols[3]:
                color = "green" if row['Change'] > 0 else "red"
                st.markdown(f"<span style='color:{color}'>{row['Change']}%</span>", unsafe_allow_html=True)
            with row_cols[4]:
                st.write(f"{row['Volume']:,}")
            with row_cols[5]:
                # Button to show/hide form for this row
                btn_label = "Close" if st.session_state.selected_row == row['ID'] else "Action"
                st.button(btn_label, key=f"btn_{row['ID']}", on_click=select_row, args=(row['ID'],))
        
        # Display form if this row is selected
        if st.session_state.selected_row == row['ID']:
            # Add a custom title for the form that's part of the form itself
            st.write(f"Edit Stock {row['ID']}")
            
            # Form wrapper to control float behavior
            st.markdown('<div class="square-form-wrapper">', unsafe_allow_html=True)
            
            # Create the compact form
            with st.form(key=f"edit_form_{row['ID']}"):
                # Two-column layout for compact fields
                col1, col2 = st.columns(2)
                
                with col1:
                    name = st.text_input("Name", value=row['Name'], key=f"name_{row['ID']}", label_visibility="collapsed")
                
                with col2:
                    price = st.number_input("Price", value=float(row['Price']), 
                                          key=f"price_{row['ID']}", label_visibility="collapsed")
                
                # Volume in a single column
                volume = st.number_input("Volume", value=int(row['Volume']), 
                                       key=f"volume_{row['ID']}", label_visibility="collapsed")
                
                # Notes field with strictly limited height
                notes = st.text_area("Notes", value="", key=f"notes_{row['ID']}", 
                                   height=50, label_visibility="collapsed")
                
                # Form buttons in columns for better layout
                btn_col1, btn_col2 = st.columns([1, 1])
                with btn_col1:
                    submit = st.form_submit_button("Submit", on_click=handle_submit)
                with btn_col2:
                    cancel = st.form_submit_button("Cancel", 
                                                 on_click=lambda: select_row(row['ID']))
            
            # Close the form wrapper div
            st.markdown('</div><div class="form-clear"></div>', unsafe_allow_html=True)
        
        # Add a separator line after each row
        st.markdown("---")

# Information column
with info_col:
    # Static information panel
    st.header("Information Panel")
    st.write("This section displays information and forms.")
    
    # Additional static content
    st.markdown("### Market Summary")
    st.write("Total Stocks: 15")
    st.write("Market Cap: ₹78.3B")
    st.write("Average Volume: 423,211")

# Display success message if form was submitted
if st.session_state.form_submitted:
    st.success("Form submitted successfully!")
    # Reset after showing the message
    st.session_state.form_submitted = False

# Add some instructions
st.sidebar.header("Instructions")
st.sidebar.write("1. Click on the 'Action' button to open the edit form")
st.sidebar.write("2. Edit the values in the form")
st.sidebar.write("3. Click 'Submit' to save or 'Cancel' to close")