let responseTimeout = {responseTimeout: 30000}

const faker = require('faker/locale/de');

describe('Should be able to get order confirmation using klarna payment', function () {

    beforeEach(function () {
        cy.clearCookies();
        cy.visit('/de');
        cy.get("[class*='ModalDialog_closeButton_']")
            .should('be.visible')
            .click()

        // intercepts
        cy.intercept("POST", /\/bag\/add$/).as("addToBag");
        cy.intercept("GET", "**/cart*").as("cart");
        cy.intercept('POST', /\/auth\/sign-up$/).as('signupUser');
        cy.intercept('GET', '**/recommended-samples/*').as('getSamples');
        cy.intercept('POST', '**/bag/set-billing-and-shipping-address').as('shippingAddress');
        cy.intercept('POST', '**/bag/set-shipping-method').as('shippingMethod');
        cy.intercept('POST', '/xoplatform/logger/api/logger').as('paymentframe');
        cy.intercept('POST', '**/payment/klarnaPayment').as('klarnaPayment');
    });


    it('should be able to pay with klarna without cookie issue', function () {


        // Generate test data inside the test because of retry logic
        let firstName =faker.name.firstName();
        let lastName = faker.name.lastName();
        let emailAddress = faker.internet.email();
        let password = 'Test@12345';
        let firstLineOfAddress = faker.address.streetAddress();
        let secondLineOfAddress = faker.address.secondaryAddress();
        let shippingPostcode = faker.address.zipCode();

        // Buy accessories
        cy.visit('/de/products/all/accessories');

        cy.url().should('include', '/de/products/all/accessories')
            .log("User landed on accessories page");

        // Selecting one accessories product
        cy.get("[data-test-id='buy-button']")
            .should("exist")
            .first()
            .click()
            .log("user selects first product under accessories")

        // Validating addToBag API response code
        cy.wait("@addToBag", responseTimeout).then(xhr => {
            expect(xhr.response.statusCode, "addToBag api status code").to.eq(200);
        })

        // Validate item count and click on bag
        cy.get('[data-test-id=bag-item-count]')
            .should('be.visible')
            .and("have.text", "1")
            .click()
            .log('User clicks on bag after checks the number of items in teh bag');

        // Validate cart API response code
        cy.wait('@cart', responseTimeout).then(xhr => {
            cy.log(`traceId: ${xhr.response.headers["x-trace-id"]}`);
            expect(xhr.response.statusCode, "cart api status code").to.eq(200);
        });

        // Your Bag validation
        cy.get('[data-test-id="bag-heading"]')
            .should('be.visible')
            .should('have.text', "Dein Warenkorb");

        // Click checkout
        cy.get("[data-test-id='kasse']")
            .should('be.visible')
            .click({force: true});

        // click on signup button
        cy.get("[data-test-id='anmeldung']")
            .should("be.visible")
            .eq(0)
            .and("exist")
            .click();

        // Enter first name
        cy.get('[id=firstName]')
            .should('be.visible')
            .type(firstName)
            .and('have.value', firstName)
            .log('User enter shipping first name', firstName);

        // Enter last name
        cy.get('[id=lastName]')
            .should('be.visible')
            .type(lastName)
            .and('have.value', lastName)
            .log('User enter shipping first name', lastName);

        // Enter email address
        cy.get('[id=email]')
            .should('be.visible')
            .type(emailAddress)
            .should('have.value', emailAddress);

        // Enter password
        cy.get('[id=password]')
            .should('be.visible')
            .type(password)
            .should('have.value', password);

        // Click on subscribe check box
        cy.get('[data-test-id$="signup-subscribe"]')
            .should('be.visible')
            .last()
            .click();

        // Click on signup button
        expect(cy.get('[class*="SignUpForm_submitButton_"]'))
            .to.exist;

        // Click on sign up button
        cy.get('[class*="SignUpForm_submitButton_"]')
            .should('be.visible')
            .click()
            .log("User clicks on signup button");

        // Intercept response check
        cy.wait('@signupUser', responseTimeout).then(xhr => {
            cy.log(`traceId: ${xhr.response.headers["x-trace-id"]}`);
            expect(xhr.response.statusCode).to.eq(201);
        });

        // Validate guest user is on samples page
        cy.wait("@getSamples", responseTimeout).then(xhr => {
            cy.log(`traceId: ${xhr.response.headers["x-trace-id"]}`);
            expect(xhr.response.statusCode).to.eq(200);
        })

        cy.url().should("include", "/checkout/samples");

        // User click on skip samples
        cy.get("[data-test-id='uberspringen']")
            .should("be.visible")
            .click()
            .log("User click on skip samples option");

        // Enter delivery address
        cy.url()
            .should('include', `/checkout/delivery-address`);

        cy.get('[data-test-id="shippingcountry"]')
            .first()
            .should('be.visible')
            .select("GERMANY")
            .should('have.value', "DE");

        cy.get('[data-test-id="shippingfirst-name"]')
            .first()
            .clear()
            .should('be.visible')
            .type(firstName)
            .should('have.value', firstName);

        cy.get('[data-test-id="shippinglast-name"]')
            .first()
            .should('be.visible')
            .clear()
            .type(lastName)
            .should('have.value', lastName);

        cy.get('[data-test-id="shippingaddress1"]')
            .first()
            .should('be.visible')
            .clear()
            .type(firstLineOfAddress)
            .should('have.value', firstLineOfAddress);

        cy.get('[data-test-id="shippingaddress2"]')
            .first()
            .should('be.visible')
            .clear()
            .type(secondLineOfAddress)
            .should('have.value', secondLineOfAddress)

        cy.get('[data-test-id="shippingcity"]')
            .first()
            .should('be.visible')
            .clear()
            .type("Berlin")
            .should('have.value', "Berlin");

        cy.get('[data-test-id="shippingcounty"]')
            .first()
            .should('be.visible')
            .clear()
            .type("Berlin")
            .should('have.value', "Berlin");

        cy.get('[data-test-id="shippingpostcode"]')
            .first()
            .should('be.visible')
            .clear()
            .type(shippingPostcode)
            .should('have.value', shippingPostcode)

        cy.get('[data-test-id="shippingphone-number"]')
            .should('be.visible')
            .clear()
            .type("455570718");

        cy.get('[data-test-id=weiter-zum-versand]')
            .should('be.visible')
            .click().log("Submit Delivery address detaills")

        cy.wait('@shippingAddress', responseTimeout).then(xhr => {
            cy.log(`traceId: ${xhr.response.headers["x-trace-id"]}`);
            expect(xhr.response.statusCode).to.eq(200);
        });

        cy.url().should('include', '/de/checkout/delivery-method')
            .log('User landed on checkout Delivery method page');

        cy.get('[data-test-id="weiter-zur-zahlung"]')
            .should('be.visible');

        // Check delivery method option
        cy.get('[data-test-id*="shippingtype-"]')
            .should('be.visible')
            .and('contains.text', "Europäische Lieferung")
            .log('User on delivery method page');

        // Click on continue to payment button
        cy.get('[data-test-id="weiter-zur-zahlung"]')
            .should('be.visible')
            .click()
            .log('User click confirm delivery method button');

        cy.wait('@shippingMethod', responseTimeout).then(xhr => {
            cy.log(`traceId: ${xhr.response.headers["x-trace-id"]}`);
            expect(xhr.response.statusCode).to.eq(200);
        });

        cy.url().should('include', '/de/checkout/payment')
            .log('User landed on checkout payment page');

        // Wait until full card payment iframe to load
        cy.wait('@paymentframe', { responseTimeout: 30000 })

        cy.scrollTo(0, 400)
        cy.log('Physical wait is needs to load payment iframes').wait(3000)

        cy.get('body').then($body => {
            if ($body.find("iframe[class='js-iframe']").length > 0) {
                cy.get("iframe[class='js-iframe']").then($header => {
                    if ($header.is(':visible')) {
                        cy.get('iframe[class="js-iframe"]')
                            .should('be.visible')
                            .and('exist')
                            .log('Payment iframe found');
                    }
                })
            } else {
                cy.log('Payment iframe not found, trying to reload the payment page').reload();
            }
        });

        //Selecting Klarna radio button
        cy.get("[class*='_radioButton']")
            .last()
            .should('exist')
            .click({force: true})
            .log('User select Klarna pay Radio button');

        // Click Terms and Conditions check box
        cy.get('#terms')
            .should('be.visible')
            .click();

        //Click on ayden klarna pay later main button
        cy.get("button[class*='adyen-checkout__button--pay']")
            .should("be.visible")
            .and("be.enabled")
            .click({force: true})
            .log('user click checkout pay button from checkout page');
        // TODO: Here user takes to Klarna payment page, its failed here with session ID wrong.




        cy.wait('@klarnaPayment', responseTimeout).then(xhr => {
            cy.log(`traceId: ${xhr.response.headers["x-trace-id"]}`);
            expect(xhr.response.statusCode).to.eq(200);
        });

        // Klarna payment page
        cy.url()
            .should('include', 'klarna.com/eu/payments')
            .log('User landed on Klarna page after checkout');

        // Klarna buy button
        expect(cy.get("iframe[id='klarna-hpp-instance-main']", { timeout: 20000 }), "Failed to load klarna-hpp-instance-main Iframe")
            .to.be.exist;
        expect(cy.get("#buy-button__text"), "klarna buy button not exist").to.be.exist;

        cy.get("#buy-button__text").scrollIntoView()
            .should("be.visible")
            .wait(5000)
            .click({ force: true })
            .log('Click Klarna Buy button');

        // Klarna enter DOB details.
        expect(cy.get("iframe[id='klarna-hpp-instance-fullscreen']", { timeout: 5000 }), "Failed to load klarna-hpp-instance-fullscreen").to.be.exist;

        cy.get("iframe[id='klarna-hpp-instance-fullscreen']")
            .then(function ($iframe) {
                const $tbody = $iframe.contents().find('body')
                const $body = $tbody[0]

                // Date of birth
                cy.wrap($body).find('[name="dateOfBirth"]')
                    .first()
                    .scrollIntoView()
                    .should('exist')
                    .click({ force: true })
                    .type(dob, { force: true })
                    .log('User enter DOB on klarna end' + dob);

                // Note: Have to submit details twice
                cy.wrap($body).find("[id='invoice_kp-purchase-approval-form-continue-button']>div>div", { timeout: 1000 })
                    .eq(0)
                    .scrollIntoView()
                    .should('exist')
                    .click({ force: true })
                    .wait(2000)
                    // .dblclick()
                    .log("Klarna submit payment details");
            });
        cy.wait(5000);

        // Order confirmation page after klarna payment, redirect back to TL website
        // Validate order confirmation page after submit klarna details
        cy.url({timeout: 20000}).should('include', 'de/order-confirmation')
            .log("Order confirmation page has been displayed");

        // Get the Order number on confirmation page
        let orderId = null;
        cy.get("[data-test-id='order-confirmation-number']+span")
            .should('be.visible')
            .then($orderNumber => {
                orderId = $orderNumber.text();
                cy.log("orderNumber: " + orderId);
                expect(orderId, "OrderNumber shouldn't be empty or null").to.not.equal(null);
            });
    });
});