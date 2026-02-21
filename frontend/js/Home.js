// Sample Indian rental data
const rentalItems = [
    {
        id: 1,
        title: "Yamaha MT 15",
        price: 768,
        image: "https://d3vp2rl7047vsp.cloudfront.net/bike_models/images/000/000/244/medium/YAMAHA_MT-15.png?1660732312",
        location: "hyderabad",
        description: "Sporty and fuel-efficient bike perfect for city rides"
    },
    {
        id: 2,
        title: "Bajaj pulsar ns200",
        price: 1080,
        image: "https://d3vp2rl7047vsp.cloudfront.net/bike_models/images/000/000/076/medium/BAJAJ__PULSAR_200NS.png?1660727897",
        location: "visakhapatnam",
        description: "Powerful bike with great pickup"
    },
    {
        id: 3,
        title: "Sonnet 2022",
        price: 4200,
        image: "https://zoomcar-assets.zoomcar.com/950325/HostCarImage/mini_magick20250216-1-1vppyun70711eea-55e0-4d25-ae9b-c41b03cb3894.jpeg",
        location: "bangalore",
        description: "Compact car with great features"
    },
    {
        id: 4,
        title: "Fronx 2024",
        price: 2976,
        image: "https://zoomcar-assets.zoomcar.com/994562/HostCarImage/mini_magick20250331-1-1xnqrix8bbd3f92-a525-4a9e-9e7a-f38425c953b1.jpeg",
        location: "chennai",
        description: "Latest model with premium features"
    },
    {
        id: 5,
        title: "Canon eos r8",
        price: 2000,
        image: "https://images.sharepal.in/categories/cameras/dslr-cameras/canon-eos-r8/canon-r8-on-rent-sharepal-2.webp",
        location: "delhi",
        description: "Professional camera for photography"
    },
    {
        id: 6,
        title: "Drill machine",
        price: 3000,
        image: "https://5.imimg.com/data5/SELLER/Default/2023/10/350699458/ZQ/FX/MQ/198984442/i-bell-electric-drill-machine-500x500.jpg",
        location: "visakhapatnam",
        description: "Heavy duty drill for construction work"
    }
];

document.addEventListener('DOMContentLoaded', function() {
    // Load rental items
    loadRentalItems();
    
    // Filter functionality
    document.getElementById('apply-filter').addEventListener('click', function() {
        const location = document.getElementById('location-filter').value;
        loadRentalItems(location);
    });
    
    // Logout functionality
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            window.location.href = 'LandingPage.html';
        }
    });
});

function loadRentalItems(location = 'all') {
    const rentalGrid = document.getElementById('rental-grid');
    
    // Filter items based on location
    const filteredItems = location === 'all' 
        ? rentalItems 
        : rentalItems.filter(item => item.location === location);
    
    rentalGrid.innerHTML = filteredItems.map(item => `
        <div class="rental-card">
            <img src="${item.image}" alt="${item.title}" class="card-image">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-price">₹${item.price}/day</p>
                <p class="card-location">${formatLocation(item.location)}</p>
                <button class="rent-btn" onclick="rentItem('${item.id}')">Rent Now</button>
            </div>
        </div>
    `).join('');
}

function formatLocation(location) {
    const locations = {
        'visakhapatnam': 'Visakhapatnam',
        'hyderabad': 'Hyderabad',
        'bangalore': 'Bangalore',
        'chennai': 'Chennai',
        'delhi': 'Delhi',
        'other': 'Other Locations'
    };
    return locations[location] || location;
}

async function rentItem(itemId) {
    try {
        const item = rentalItems.find(i => i.id == itemId);
        if (!item) return;

        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'Authentication.html';
            return;
        }

        // Add loading state
        const rentBtn = event.target;
        rentBtn.disabled = true;
        rentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        const response = await fetch('https://rental-marketplace-so44.onrender.com/api/rentals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: item.id,
                title: item.title,
                price: item.price,
                image: item.image,
                location: item.location,
                description: item.description
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create rental');
        }

        const rental = await response.json();
        
        alert(`Success! Your rental for ${item.title} is ${rental.status}.`);
        window.location.reload(); // Refresh to show new rental
        
    } catch (error) {
        console.error('Rental error:', error);
        alert(`Failed to create rental: ${error.message}`);
        
        // Reset button if available
        if (event.target) {
            event.target.disabled = false;
            event.target.innerHTML = 'Rent Now';
        }
    }
}

async function rentItem(itemId) {
    try {
        const item = rentalItems.find(i => i.id == itemId);
        if (!item) throw new Error('Item not found');

        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'Authentication.html';
            return;
        }

        const response = await fetch('https://rental-marketplace-so44.onrender.com/api/rentals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId: item.id, // This should now match the schema
                title: item.title,
                price: item.price,
                image: item.image,
                location: item.location,
                description: item.description
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create rental');
        }

        const rental = await response.json();
        alert(`Success! Rental created with status: ${rental.status}`);
        window.location.reload();
        
    } catch (error) {
        console.error('Rental error:', error);
        alert(`Error: ${error.message}`);
    }
}