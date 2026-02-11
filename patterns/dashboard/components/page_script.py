"""
JavaScript for dynamic page elements
"""

def load_js():
    """Load custom JavaScript for dynamic components"""
    return """
    <script>
    // Tab switching functionality
    function activateTab(clickedTab, tabId) {
        // Remove active class from all tabs
        const tabs = document.querySelectorAll('.custom-tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        clickedTab.classList.add('active');
        
        // Hide all tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.style.display = 'none');
        
        // Show the selected tab content
        document.getElementById(tabId).style.display = 'block';
    }
    
    // Update market time every second
    function updateMarketTime() {
        const marketTimeEl = document.getElementById('market-time');
        if (marketTimeEl) {
            const now = new Date();
            const formattedTime = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-IN')}`;
            marketTimeEl.textContent = formattedTime;
        }
    }
    
    // Initialize
    setInterval(updateMarketTime, 1000);
    </script>
    """ 