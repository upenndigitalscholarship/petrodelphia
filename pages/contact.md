---
title: contact
layout: page
permalink: /contact.html
---
<div class="contactForm">
<h2>Contact Us</h2>
 <form action="mailto:mhunter2@upenn.edu" method="get" enctype="text/plain">

    Subject:<br>

    <input type="text" name="subject" placeholder="Your Name"><br>

    Email:<br>

    <input type="email" name="email" placeholder="Your Email"><br>

    Message:<br>

    <textarea name="body" rows="5" cols="30" placeholder="Your Message"></textarea><br>

    <input type="submit" value="Send">

  </form>


{% include feature/button.html text="Contact Us" link="mailto:mhunter2@upenn.edu" color="success" %}
