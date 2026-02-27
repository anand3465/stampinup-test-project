1. Given an Orders table with columns OrderId, CustomerId, OrderDate, Status, and Total, write a query to find all orders placed in the last 30 days with a status of 'Failed'.

**Answer:**

```sql
SELECT * FROM Orders o
WHERE o.OrderDate >= getdate() - 30
AND o.Status = 'Failed';
```

2. Given a Customers table (CustomerId, Name, Email) and the Orders table above, write a query that returns the customer name, email, and order total for all orders over $100.

**Answer:**

```sql
SELECT c.Name, c.Email, o.Total
FROM Orders o
JOIN Customers c
ON o.CustomerId = c.CustomerId
WHERE o.Total > 100;
```


3. Using the same tables, write a query that returns how many orders each customer has placed. Include customers who have placed zero orders.

**Answer:**

```sql
SELECT c.CustomerId, c.Name, COUNT(o.OrderId) AS NumberOfOrders
FROM Customers c
LEFT JOIN orders o
ON c.CustomerId = o.CustomerId
GROUP BY c.CustomerId, c.Name
ORDER BY c.CustomerId;  
```


4. Here's a query that's supposed to return all customers who have never placed an order, but it's returning zero rows even though we know some exist. What's wrong?

```sql
SELECT c.Name, c.Email
FROM Customers c
LEFT JOIN Orders o ON c.CustomerId = o.CustomerId
WHERE o.Status = 'Completed';
```

**Answer:**

The condition WHERE o.Status = 'Completed' mandates that an order exists with status 'Completed' which filters out the customers with no orders.

```sql
--If OrderID is primarykey(not null):--

SELECT c.Name, c.Email
FROM Customers c
LEFT JOIN Orders o
ON c.CustomerId = o.CustomerId
WHERE o.OrderId is null;

--OR--

SELECT c.CustomerId, c.Name, COUNT(o.OrderId) AS NumberOfOrders
FROM Customers c
LEFT JOIN orders o
ON c.CustomerId = o.CustomerId
GROUP BY c.CustomerId, c.Name
HAVING COUNT(o.OrderId) = 0
ORDER BY c.CustomerId;  
```