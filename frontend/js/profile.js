document.addEventListener('DOMContentLoaded', async function() {
    // Debug: Check if token exists
    console.log('Auth Token:', localStorage.getItem('authToken'));

    // Load profile data from server
    async function loadProfile() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                window.location.href = 'LandingPage.html';
                return;
            }

            const response = await fetch('http://localhost:5000/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Debug: Check response status
            console.log('Profile response status:', response.status);

            if (!response.ok) {
                throw new Error(`Failed to load profile: ${response.status}`);
            }

            const profile = await response.json();
            
            // Debug: Check received profile data
            console.log('Profile data received:', profile);

            // Fill form fields
            if (profile) {
                document.getElementById('username').value = profile.name || '';
                document.getElementById('email').value = profile.email || '';
                document.getElementById('phone').value = profile.phone || '';
                document.getElementById('address').value = profile.address || '';
                document.getElementById('profile-pic').src = profile.profilePic || 'https://via.placeholder.com/150';
            }
            
            return profile;
        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Error loading profile: ' + error.message);
            return null;
        }
    }

    // Save profile to server
    async function saveProfile(profileData) {
        try {
            const response = await fetch('http://localhost:5000/api/user', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save profile');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving profile:', error);
            throw error;
        }
    }

    // Make fields editable (remove disabled attributes)
    function enableEditing() {
        document.getElementById('phone').removeAttribute('disabled');
        document.getElementById('address').removeAttribute('disabled');
    }

    // Handle profile picture upload
    document.getElementById('profile-pic-input').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        try {
            const response = await fetch('http://localhost:5000/api/user/avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });
            
            if (!response.ok) throw new Error('Failed to upload avatar');
            
            const result = await response.json();
            document.getElementById('profile-pic').src = result.profilePic;
            alert('Profile picture updated successfully!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload profile picture: ' + error.message);
        }
    });

    // Handle form submission
    document.getElementById('profile-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const profileData = {
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value
        };
        
        try {
            await saveProfile(profileData);
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Failed to update profile: ' + error.message);
        }
    });

    // Initialize the page
    await loadProfile();
    enableEditing();
});