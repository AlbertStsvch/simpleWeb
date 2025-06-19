document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('helloBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            alert('Привет!');
        });
    }
}); 