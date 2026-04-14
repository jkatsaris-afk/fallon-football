const handleSubmit = async () => {
  if (!file) {
    alert("Profile picture is required");
    return;
  }

  setLoading(true);

  try {
    /* ================= 1. SIGN UP ================= */

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

    if (authError) throw authError;

    /* ================= 2. LOGIN ================= */

    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      });

    if (loginError) throw loginError;

    const user = loginData.user;

    if (!user) {
      throw new Error("User authentication failed");
    }

    /* ================= 3. UPLOAD IMAGE ================= */

    const fileName = `${user.id}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    /* ================= 4. INSERT REF ================= */

    const { error: insertError } = await supabase
      .from("referees")
      .insert([
        {
          auth_id: user.id,
          first_name: form.firstName,
          last_name: form.lastName,
          phone: form.phone,
          email: form.email,
          age: Number(form.age),
          experience: form.experience,
          availability: form.availability,
          notes: form.notes,
          profile_image: fileName,
          status: "pending"
        }
      ]);

    if (insertError) throw insertError;

    alert("Account Created!");

  } catch (err) {
    console.error(err);
    alert(err.message);
  }

  setLoading(false);
};
