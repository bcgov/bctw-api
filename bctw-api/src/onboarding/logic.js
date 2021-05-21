const clicked = () => {
  const input = document.getElementById('icon_prefix')
  const email = input.value;
  const re = /^[^\s@]+@[^\s@]+$/; // Match a valid email

  // If successful... Display then blank input 
  if (re.test(email)) {
    M.toast({html: 'Your request was sent successfully'})
    input.value = '';
  }

}