Awesome, we got another fun feature. We're going to allow visitor post submissions. But here's how we're going to handle it, I think you'll like the simplicity.

Splinter creation/editing will have a checkbox to enable visitor submissions. When checked, it will show a form that includes the following:

Prompt (multiline text input),

checkboxes for whether to include:
First Name (text) + required (true/false)
Last Name (text) + required (true/false)
Email (email) + required (true/false)
Phone (phone) + required (true/false)
Leave anonymous (true/false)

default zero:
minimum word count (number)
maximum word count (number)
minimum images (number)
maximum images (number)

Then, if a splinter has visitor submissions enabled, we show a form with all the fields that are not marked falsey in the config settings when non-admin users visit the splinter page. If a user inputs all the required values and a post within the minimum/maximum word count (if present), then we enable a "submit" button. Once submitted, we tell the user that their post has been submitted successfully and is under review.

Then on the admin page, we have an inbox section that shows all the submissions awaiting approval. If I approve the post, it shows on the splinter page along with all the admin-created posts. If it isn't marked anonymous, we show the first and last name. 