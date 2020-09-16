# Todos App

## Assumption:
- I am assuming that the `/api/reset` endpoint is only for development purposes, so I did not include it in my app.

## Inconsistency:

There is a behavior in the [live app provided](https://d3905n0khyu9wc.cloudfront.net/assessment/todo-js/todo_v3.html) that I was not able to replicate. It does not seem that this behavior is spelled out in the requirements of the project, but I wanted to point out the inconsistency between the live app and my own and discuss what I believe is the reason for it...

In the live app, if the user selects an existing todo that already has a value other than its default for either the day, month, year, or description, and then changes one or more of these values back to its default, then whenever the user saves the update and then once again selects that same todo, the updated values (which will be the default at this point) are displayed.

However, in my app, when one or more of these values of an existing todo is changed back to the default value and then saved, revisiting this todo will show that none of the values changed to the default, but are retained to be what they were. In other words, once a todo's day, month, year, or description has been set, the user cannot reset this value to its default.

I believe the cause of this can be explained from the API documentation. Under the `Updates a todo.` section, it is stated that **"If the key/value pair is not present, its previous value is preserved."**

My app is unable to send an ajax request that can return a todo's state to its default values because if the default values are sent, they are sent as empty strings. Therefore, the API sees these values as **not present** and the **previous value is preserved**.

When I discovered this, I wondered how the live app is able to accomplish this behavior. After investigating a bit, it seems to me that the live app is not using the API for data interaction, but the `localStorage` property of the `Window` object. Because of this, it is not bound by the formatting requirements of the API and can acheive this behavior by some other means.

Hopefully I am not misunderstanding the reasoning behind this inconsistency in behavior. If so, please let me know so I can better understand.

Thanks,
Zac