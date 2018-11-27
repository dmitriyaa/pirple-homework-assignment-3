# Homework Assignment #3
## The Assignment (Scenario):
It is time to build a simple frontend for the Pizza-Delivery API you created in Homework Assignment #2. Please create a web app that allows customers to:
1. Signup on the site

2. View all the items available to order

3. Fill up a shopping cart

4. Place an order (with fake credit card credentials), and receive an email receipt

This is an open-ended assignment. You can take any direction you'd like to go with it, as long as your project includes the requirements. It can include anything else you wish as well.

## Comments
* The application should be pretty straight forward to use.

## Notes
* Before using the api, please go to the /lib/config.js file and add stipe and mailgun tokens example of config: 'stripeToken': 'stripekeytoken', 'mailgunToken': 'mailguntoken', 'mailgunEmailDomain': 'sandbox123123123.mailgun.org'
* In order to test the payment, please use the token: tok_mastercard

## ToDos
I know that there are a lot of things that could be improved, I will try to implement them in near future :)
* Clear the cart after order successfully completed
* Add an option to reduce amount of items, instead of only deleting them
* Improve the design, so it's more pizza restaurant related
* Implement payment with credit card instead of token
