const clicked = async () => {
  const input = document.getElementById('icon_prefix')
  const email = input.value;
  const re = /^[^\s@]+@[^\s@]+$/; // Match a valid email

  // If successful... Display then blank input 
  if (re.test(email)) {
    const request = new Request('/onboarding',{
      method: 'POST',
      body: `{"email":"${email}"}`
    });

    fetch(request)
      .then(() => {
        M.toast({html: 'Your request was sent successfully'});
        input.value = '';
      })
      .catch(() => {
        M.toast({html: 'Your request was not successfully'});
      });
  }
}