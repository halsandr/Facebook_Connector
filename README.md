# Facebook_Connector
**Google Data Studio Community Connector for Facebook Insights.**


Follow the setup from [here](https://github.com/googlesamples/apps-script-oauth2) to get the OAuth2 working, dont forget to fill in the `CLIENT_ID` and `CLIENT_SECRET` at the top of `Facebook_OAuth2.gs`.

There is also the option to put your email address in `Code.gs` in the function `isAdminUser()`, this will give you slightly more verbose errors should you encounter them.

[Google's Community Connector Guide](https://developers.google.com/datastudio/connector/get-started) is a very usefull resource when setting up your community connector, Developer access will also need to be [requested](https://goo.gl/forms/MfxSU71PqP3P0RoM2) before you can use your Community Connector.
