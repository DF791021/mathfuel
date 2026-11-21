# Ten visitors, one T-shirt shop

## Purpose and setup

**A proposed MathFuel classroom simulation:** connect arithmetic, customer choices, meaningful records, and economic reasoning. This blueprint does not describe an implemented checkout or live store. Everything below is fictional. Teachers choose the pace, representations, and stopping point; the same shop can support counting practice or a discussion about evidence.

Give each scenario ten visitor cards, V01–V10. Count each person once in that scenario. Every visitor sees the stated offer; each buyer purchases at most one shirt. Assume enough suitable stock, no returns, and a **$4 variable cost for each shirt sold**. Treat each row below as a separate imagined situation, not repeated observations of the same customers.

## Count the right things

- **Visitors:** the ten people who encounter the offer, including those who leave without buying.
- **Buyers:** visitors who make a purchase.
- **Units:** shirts sold, calculated by adding quantities on sale lines.

Buyers and units happen to match here because of the one-shirt limit. If one buyer later purchases three shirts, those counts separate. Ask learners to explain this before calculating percentages.

## Three assumed outcomes

| Price per shirt | Visitors | Buyers / units | Buyers ÷ visitors | Revenue | Variable costs | Contribution |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| $10 | 10 | 6 / 6 | 6/10 = 60% | $60 | $24 | $36 |
| $15 | 10 | 4 / 4 | 4/10 = 40% | $60 | $16 | $44 |
| $20 | 10 | 2 / 2 | 2/10 = 20% | $40 | $8 | $32 |

**Revenue = price × units.** **Contribution = revenue − variable costs**, or `(price − $4) × units` here. Contribution is the amount available toward fixed costs and any remaining profit; it is **not net profit**.

The first two scenarios earn equal revenue, but selling fewer shirts incurs less variable cost. The $15 scenario therefore has the largest contribution **among these invented examples**. These assumed outcomes neither predict how customers respond to price nor prove a best price. Another assumed buyer count could change the comparison.

## Separate evidence from explanations

In a future simulation, a recorded offer, purchase, quantity, or unavailable size would be an event. “The price was too high” would be a hypothesis unless a visitor said it; even then, the record establishes what that visitor reported, not a complete causal explanation. No purchase might reflect fit, colour, budget, timing, or an alternative product. Leave unknown reasons unknown.

OpenStax explains demand as a relationship between prices and quantities, with other influences held constant when examining the law of demand. Our invented table is an arithmetic exercise, not an estimated demand curve. [Demand and markets, §3.1](https://openstax.org/books/principles-microeconomics-3e/pages/3-1-demand-supply-and-equilibrium-in-markets-for-goods-and-services).

## Decide what one record means

Before introducing SQL, let learners sort paper cards into these record types. IDs connect records without copying every detail into every row.

| Record | Meaning and useful fields |
| --- | --- |
| **Visit** | One counted visitor encounter: `visit_id`, `scenario_id`, time, and `offer_id` shown. Create this even when nobody buys. |
| **Offer** | One product offered on stated terms: `offer_id`, `product_id`, displayed price, currency, and scenario or effective dates. |
| **Product** | One sellable variant: `product_id`, description, size, and colour. Different sizes can have different stock. |
| **Sale line** | One product purchased during a visit: `line_id`, `visit_id`, `offer_id`, `product_id`, quantity, sale time, `unit_price_at_sale`, and `unit_variable_cost_at_sale`. |
| **Feedback** | One response to a question: `feedback_id`, `visit_id`, relevant offer, question, and response. Distinguish “no response” from “too expensive.” |

The sale line stores **historical price and cost snapshots**. Changing tomorrow’s offer or supplier cost must not rewrite yesterday’s revenue or contribution. Current product information and past transaction facts serve different purposes.

A transactions-only table loses nonbuyers: six sales could come from ten visitors or a hundred. Begin with all visit records and connect any sale lines to them. That preserves the denominator and makes 60% distinguishable from 6%. For a later lesson, model multiple offers per visit separately instead of silently changing what one visit row means.

## Teach in layers

1. **Counting:** move visitor tokens into “bought” and “did not buy”; check that both groups total ten. Match one shirt token to each buyer.
2. **Money:** use repeated addition, multiplication, and subtraction to calculate revenue, variable costs, and contribution. Compare the two $60 totals.
3. **Ratios:** represent buyers out of ten with a ten-frame, fractions, and percentages. Discuss why revenue, contribution, and purchase rate answer different questions.
4. **Evidence and testing:** label each statement “recorded,” “assumed,” or “hypothesised.” Propose comparable sessions, record exposure counts and stock, and change one factor when practical. Ten visitors provide limited evidence, especially when visitor preferences differ.

Teachers can pause at any layer. OpenStax’s discussion of income, prices, and preferences supports older learners exploring why customers face different choices and trade-offs. [Consumption choices, §6.2](https://openstax.org/books/principles-microeconomics-3e/pages/6-2-how-changes-in-income-and-prices-affect-consumption-choices).

## Extend and reflect

Add eight shirts in stock: feasible sales cannot exceed available units, and missing sizes may explain lost sales. Track starting stock, sales, and remaining stock; distinguish inventory purchases from the variable cost assigned to shirts sold.

Add a fictional $20 stall fee. Contributions of $36, $44, and $32 leave $16, $24, and $12 **after that fee, before other omitted expenses**. These are not claims of net profit.

Finish with three prompts: **What does one row mean? Which people are missing from our records? What evidence would help us choose the next experiment?** The proposed next build is a transparent shop simulation where learners vary assumptions and inspect records, with teachers guiding the learning.
