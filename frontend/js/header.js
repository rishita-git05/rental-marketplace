// Highlight active nav link
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Logout functionality
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    });

// Add to dropdown content
dropdownContent.innerHTML += `
    <a href="profile.html">My Profile</a>
    <a href="account.html">My Listings</a>
`;

    // Footer link popups
    const footerLinks = document.querySelectorAll('.footer-links a');
    footerLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const linkText = this.textContent;
            alert(`This would normally navigate to the ${linkText} page. This is a demo.`);
        });
    });
});