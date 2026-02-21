document.addEventListener('DOMContentLoaded', async function() {
    // Load rentals from database
    async function loadRentals() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'index.html';
                return [];
            }

            const response = await fetch('https://rental-marketplace-so44.onrender.com/api/rentals', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load rentals: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error loading rentals:', error);
            alert('Error loading rentals: ' + error.message);
            return [];
        }
    }

    // Format location for display
    function formatLocation(location) {
        const locations = {
            'visakhapatnam': 'Visakhapatnam',
            'hyderabad': 'Hyderabad',
            'bangalore': 'Bangalore',
            'chennai': 'Chennai',
            'delhi': 'Delhi',
            'other': 'Other'
        };
        return locations[location] || location;
    }

    // Display rentals in the UI
    async function displayRentals() {
        const rentals = await loadRentals();
        const rentalsList = document.getElementById('rentals-list');

        if (rentals.length === 0) {
            rentalsList.innerHTML = `
                <div class="no-rentals">
                    <p>You have no rental requests yet.</p>
                    <a href="Home.html" class="browse-btn">Browse Rentals</a>
                </div>
            `;
        } else {
            rentalsList.innerHTML = rentals.map(rental => `
                <div class="rental-item" data-id="${rental._id}">
                    <img src="${rental.image}" alt="${rental.title}" class="rental-image">
                    <div class="rental-info">
                        <h3>${rental.title}</h3>
                        <p>Requested on: ${new Date(rental.date).toLocaleDateString()}</p>
                        <p>Price: ₹${rental.price}/day</p>
                        <p>Location: ${formatLocation(rental.location)}</p>
                    </div>
                    <div class="rental-status status-${rental.status.toLowerCase()}">
                        ${rental.status}
                    </div>
                    <div class="rental-actions">
                        <button class="details-btn" data-id="${rental._id}">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                        <button class="cancel-btn" data-id="${rental._id}" 
                            title="Cancel request" ${rental.status === 'Accepted' ? 'disabled' : ''}>
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Add event listeners to all buttons
            document.querySelectorAll('.details-btn').forEach(btn => {
                btn.addEventListener('click', () => showDetails(btn.dataset.id));
            });
            
            document.querySelectorAll('.cancel-btn').forEach(btn => {
                btn.addEventListener('click', () => confirmCancel(btn.dataset.id));
            });
        }
    }

    // Show rental details in modal
    async function showDetails(rentalId) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'index.html';
                return [];
            }

            const response = await fetch('https://rental-marketplace-so44.onrender.com/api/rentals', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load rental details');
            }

            const rental = await response.json();
            const modal = document.getElementById('detailsModal');

            // Owner details (would normally come from the database)
            const ownerDetails = {
                name: 'Rohan Mishra',
                phone: '76894 34089',
                email: 'rohanmishra@example.com',
                address: '123 street, Visakhapatnam',
                pickupInstructions: 'Please bring your ID proof when picking up the item',
                deliveryOption: 'Not available'
            };

            document.getElementById('modal-title').textContent = `Rental Details`;
            document.getElementById('modal-body').innerHTML = `
                <div class="owner-details">
                    <h3>Owner Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span>${ownerDetails.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Contact:</span>
                        <span>${ownerDetails.phone}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span>${ownerDetails.email}</span>
                    </div>
                    
                    <h3 style="margin-top: 1.5rem;">Collection Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Address:</span>
                        <span>${ownerDetails.address}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Pickup Instructions:</span>
                        <span>${ownerDetails.pickupInstructions}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Delivery Option:</span>
                        <span>${ownerDetails.deliveryOption}</span>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';
        } catch (error) {
            console.error('Error showing details:', error);
            alert('Failed to load rental details: ' + error.message);
        }
    }

    // Cancel a rental
    async function confirmCancel(rentalId) {
        if (!confirm('Are you sure you want to cancel this rental request?')) {
            return;
        }

        try {
            const response = await fetch(`https://rental-marketplace-so44.onrender.com/api/rentals/${rentalId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to cancel rental');
            }

            alert('Rental request has been cancelled.');
            await displayRentals(); // Refresh the list
        } catch (error) {
            console.error('Error cancelling rental:', error);
            alert('Failed to cancel rental: ' + error.message);
        }
    }

    // Initialize modal close functionality
    document.querySelector('.close-modal')?.addEventListener('click', function() {
        document.getElementById('detailsModal').style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('detailsModal')) {
            document.getElementById('detailsModal').style.display = 'none';
        }
    });

    // Handle logout
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    });

    // Initialize the page
    await displayRentals();
});