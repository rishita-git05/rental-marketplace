document.addEventListener('DOMContentLoaded', function() {
  const API_BASE_URL = 'https://rental-marketplace-so44.onrender.com';
   let currentUser = null;

  // Initialize the page
  async function init() {
      await loadProfileData();
      await renderItems();
      setupEventListeners();
      setupImagePreviews();
  }

  // Load user profile data
  async function loadProfileData() {
      try {
          const response = await fetch(`${API_BASE_URL}/api/user`, {
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
          });
          if (!response.ok) throw new Error('Failed to load profile');
          currentUser = await response.json();
      } catch (error) {
          console.error('Error loading profile:', error);
          // Handle unauthorized (redirect to login)
          if (error.message.includes('401')) {
              window.location.href = 'LandingPage.html';
          }
      }
  }

  // Load items from server
  async function loadItems() {
      try {
          const response = await fetch(`${API_BASE_URL}/api/items`, {
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
          });
          if (!response.ok) throw new Error('Failed to load items');
          return await response.json();
      } catch (error) {
          console.error('Error loading items:', error);
          return [];
      }
  }

  // Render items to the page
  async function renderItems(forceRefresh = false) {
    try {
        const itemsList = document.getElementById('my-items-list');
        if (!itemsList) return;

        // Add cache-busting parameter if forcing refresh
        const url = forceRefresh 
            ? `${API_BASE_URL}/api/items?t=${Date.now()}` 
            : `${API_BASE_URL}/api/items`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            cache: forceRefresh ? 'no-cache' : 'default'
        });

        if (!response.ok) throw new Error('Failed to load items');
        
        const items = await response.json();
        console.log('Received items:', items); // Debug log

        if (!items || items.length === 0) {
            itemsList.innerHTML = '<p>You have no listed items yet.</p>';
            return;
        }

        itemsList.innerHTML = items.map(item => `
            <div class="item-card" data-id="${item._id}">
                <img src="${item.image}" alt="${item.title}" 
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/150'">
                <h3>${item.title}</h3>
                <p class="price">₹${item.price}/day</p>
                <p><strong>Location:</strong> ${formatLocation(item.location)}</p>
                <p><strong>Category:</strong> ${formatCategory(item.category)}</p>
                <p>${item.description}</p>
                <div class="item-actions">
                    <button class="edit-btn" data-id="${item._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" data-id="${item._id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Reattach event listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => confirmDeleteItem(btn.dataset.id));
        });

    } catch (error) {
        console.error('Error rendering items:', error);
        const itemsList = document.getElementById('my-items-list');
        if (itemsList) {
            itemsList.innerHTML = '<p>Error loading items. Please refresh the page.</p>';
        }
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

  // Format category for display
  function formatCategory(category) {
      const categories = {
          'electronics': 'Electronics',
          'vehicles': 'Vehicles',
          'furniture': 'Furniture',
          'tools': 'Tools',
          'sports': 'Sports Equipment',
          'other': 'Other'
      };
      return categories[category] || category;
  }

  // Setup event listeners
  function setupEventListeners() {
    const editForm = document.getElementById('edit-item-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            console.log("Edit form submitted"); // Verify form submission
            updateItem(e).catch(error => {
                console.error("Uncaught error in updateItem:", error);
            });
        });
    } else {
        console.error("Edit form element not found!");
    }
    // Add new item form
    document.getElementById('add-item-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        await addNewItem();
    });

    // Edit item form - ONLY ONE LISTENER NEEDED
    document.getElementById('edit-item-form').addEventListener('submit', updateItem);

    // Close modal button
    document.querySelector('.close-modal').addEventListener('click', function() {
        document.getElementById('editModal').style.display = 'none';
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            window.location.href = 'LandingPage.html';
        }
    });

    // Image preview for edit form
    document.getElementById('edit-item-image-url')?.addEventListener('input', function() {
        const preview = document.getElementById('edit-image-preview');
        const url = this.value;
        if (url) {
            preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.src='https://via.placeholder.com/300'">`;
            preview.style.display = 'block';
        } else {
            preview.innerHTML = '';
            preview.style.display = 'none';
        }
    });
}

  // Setup image previews
  function setupImagePreviews() {
      // Add item image preview
      document.getElementById('item-image').addEventListener('change', function(e) {
          const preview = document.getElementById('image-preview');
          preview.innerHTML = '';
          
          if (e.target.files[0]) {
              const img = document.createElement('img');
              img.src = URL.createObjectURL(e.target.files[0]);
              preview.appendChild(img);
              preview.style.display = 'block';
          }
      });

      // Edit item image preview
      document.getElementById('edit-item-image').addEventListener('change', function(e) {
          const preview = document.getElementById('edit-image-preview');
          preview.innerHTML = '';
          
          if (e.target.files[0]) {
              const img = document.createElement('img');
              img.src = URL.createObjectURL(e.target.files[0]);
              preview.appendChild(img);
              preview.style.display = 'block';
          }
      });
  }

  // Add new item
  async function addNewItem() {
    const form = document.getElementById('add-item-form');
    if (!form) return;
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const imagePreview = document.getElementById('image-preview');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('Please login again');
        }

        const itemData = {
            title: document.getElementById('item-title')?.value,
            description: document.getElementById('item-desc')?.value,
            price: document.getElementById('item-price')?.value,
            location: document.getElementById('item-location')?.value,
            category: document.getElementById('item-category')?.value,
            imageUrl: document.getElementById('item-image-url')?.value
        };

        // Validate all fields
        for (const [key, value] of Object.entries(itemData)) {
            if (!value) throw new Error(`Please fill in ${key}`);
        }

        const response = await fetch(`${API_BASE_URL}/api/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to add item');
        }

        const data = await response.json();
        console.log('Item added:', data);
        
        form.reset();
        if (imagePreview) {
            imagePreview.innerHTML = '';
            imagePreview.style.display = 'none';
        }
        
        await renderItems();
        alert('Item added successfully!');
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Item';
    }
}
async function loadItems() {
  try {
      const token = localStorage.getItem('authToken');
      if (!token) {
          console.error('No authentication token found');
          return [];
      }

      const response = await fetch(`${API_BASE_URL}/api/items`, {
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });

      if (!response.ok) {
          const error = await response.text();
          console.error('Failed to load items:', error);
          return [];
      }

      return await response.json();
  } catch (error) {
      console.error('Network error:', error);
      return [];
  }
}

async function renderItems() {
  try {
      const itemsList = document.getElementById('my-items-list');
      if (!itemsList) {
          console.error('Items list container not found!');
          return;
      }

      const items = await loadItems();
      console.log('Rendering items:', items); // Debug log

      if (!items || items.length === 0) {
          itemsList.innerHTML = '<p>You have no listed items yet.</p>';
          return;
      }

      itemsList.innerHTML = items.map(item => `
          <div class="item-card" data-id="${item._id}">
              <img src="${item.image}" alt="${item.title}" 
                   onerror="this.onerror=null;this.src='https://via.placeholder.com/150'">
              <h3>${item.title}</h3>
              <p class="price">₹${item.price}/day</p>
              <p><strong>Location:</strong> ${formatLocation(item.location)}</p>
              <p><strong>Category:</strong> ${formatCategory(item.category)}</p>
              <p>${item.description}</p>
              <div class="item-actions">
                  <button class="edit-btn" data-id="${item._id}">
                      <i class="fas fa-edit"></i> Edit
                  </button>
                  <button class="delete-btn" data-id="${item._id}">
                      <i class="fas fa-trash-alt"></i> Delete
                  </button>
              </div>
          </div>
      `).join('');

      // Add event listeners
      document.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', () => openEditModal(btn.dataset.id));
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', () => confirmDeleteItem(btn.dataset.id));
      });

  } catch (error) {
      console.error('Error rendering items:', error);
      const itemsList = document.getElementById('my-items-list');
      if (itemsList) {
          itemsList.innerHTML = '<p>Error loading items. Please refresh the page.</p>';
      }
  }
}

  // Open edit modal
  async function openEditModal(itemId) {
    const modal = document.getElementById('editModal');
    if (!modal) {
        console.error('Edit modal not found in DOM');
        return;
    }

    // Show loading state
    const modalContent = modal.querySelector('.modal-content');
    const originalContent = modalContent.innerHTML;
    modalContent.innerHTML = '<p>Loading item details...</p>';
    modal.style.display = 'flex';

    try {
        // First get all items
        const response = await fetch(`${API_BASE_URL}/api/items`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const items = await response.json();
        const item = items.find(i => i._id === itemId);
        
        if (!item) {
            throw new Error('Item not found in your listings');
        }

        // Restore original content
        modalContent.innerHTML = originalContent;

        // Now populate the form
        document.getElementById('edit-item-id').value = item._id;
        document.getElementById('edit-item-title').value = item.title;
        document.getElementById('edit-item-price').value = item.price;
        document.getElementById('edit-item-desc').value = item.description;
        document.getElementById('edit-item-image-url').value = item.image;
        document.getElementById('edit-item-location').value = item.location;
        document.getElementById('edit-item-category').value = item.category;

        // Show current image
        const preview = document.getElementById('edit-image-preview');
        if (preview) {
            preview.innerHTML = item.image 
                ? `<img src="${item.image}" alt="Current Image">` 
                : '<p>No image available</p>';
            preview.style.display = 'block';
        }

    } catch (error) {
        console.error('Error in openEditModal:', error);
        modalContent.innerHTML = `
            <div>
                <p>Error loading item: ${error.message}</p>
                <button onclick="document.getElementById('editModal').style.display='none'">Close</button>
            </div>
        `;
    }
}
  // Update item
  async function updateItem(e) {
    e.preventDefault();
    console.log("Update initiated");
    
    const form = document.getElementById('edit-item-form');
    const itemId = document.getElementById('edit-item-id').value;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const updatedData = {
            title: document.getElementById('edit-item-title').value,
            description: document.getElementById('edit-item-desc').value,
            price: parseFloat(document.getElementById('edit-item-price').value),
            location: document.getElementById('edit-item-location').value,
            category: document.getElementById('edit-item-category').value,
            imageUrl: document.getElementById('edit-item-image-url').value
        };

        console.log("Sending update:", updatedData);

        const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(updatedData)
        });

        console.log("Response status:", response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Server error response:", errorData);
            throw new Error(errorData.message || 'Failed to update item');
        }

        const result = await response.json();
        console.log("Update successful, received:", result);

        // Close modal
        document.getElementById('editModal').style.display = 'none';
        
        // Force complete reload
        console.log("Reloading items...");
        await renderItems();
        
        alert('Item updated successfully!');
    } catch (error) {
        console.error("Update failed:", error);
        alert(`Update failed: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}
  // Confirm and delete item
  async function confirmDeleteItem(itemId) {
      if (!confirm('Are you sure you want to delete this item?')) return;

      try {
          const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${localStorage.getItem('authToken')}`
              }
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to delete item');
          }

          alert('Item deleted successfully!');
          await renderItems();
      } catch (error) {
          console.error('Error deleting item:', error);
          alert('Error: ' + error.message);
      }
  }

  // Initialize the page
  init();
});