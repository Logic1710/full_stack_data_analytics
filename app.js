const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const port = 4000;

// app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/fullstack-data-visualization', { useNewUrlParser: true, useUnifiedTopology: true });

// Define a Mongoose schema and model for your collection
const electricVehicleSchema = new mongoose.Schema({
    // Define the schema according to your collection structure
    "VIN (1-10)": String,
    County: String,
    City: String,
    State: String,
    "Postal Code": Number,
    "Model Year": Number,
    Make: String,
    Model: String,
    "Electric Vehicle Type": String,
    "Clean Alternative Fuel Vehicle (CAFV) Eligibility": String,
    "Electric Range": Number,
    "Base MSRP": Number,
    "Legislative District": Number,
    "DOL Vehicle ID": Number,
    "Vehicle Location": String,
    "Electric Utility": String,
    "2020 Census Tract": Number
}, { collection: 'electric-vehicle-usa' }); // Make sure to match the collection name in MongoDB

const ElectricVehicleUSA = mongoose.model('ElectricVehicleUSA', electricVehicleSchema);

// Example route to return JSON data
app.get('/data', async (req, res) => {
    console.log('GET request to /data received');
    try {
        const data = await ElectricVehicleUSA.find().limit(500);
        console.log('Data sent:', data.length, 'records');
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error retrieving data');
    }
});

app.get('/data_count', async (req, res) => {
    console.log('GET request to /data_count received');
    try {
        const data = await ElectricVehicleUSA.aggregate([
            { $group: { _id: "$VIN (1-10)" } },  // Group by VIN
            { $count: "totalUniqueVINs" }        // Count the total number of unique VINs
        ]);
        console.log('Total unique VINs:', data);
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error retrieving data');
    }
});


app.get('/data/aggregated_brand', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.aggregate([
            { $group: { _id: "$Make", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        res.json(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/data/aggregated_city', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.aggregate([
            { $group: { _id: "$City", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        res.json(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/data/aggregated_county', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.aggregate([
            { $group: { _id: "$County", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        res.json(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/data/aggregated_year', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.aggregate([
            { $group: { _id: "$Model Year", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        res.json(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/data/model', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.aggregate([
            { $group: { _id: "$Model", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        res.json(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/data/model_range', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.aggregate([
            {
                $group: {
                    _id: "$Model",
                    count: { $sum: 1 },
                    electricRange: { $first: "$Electric Range" }  // Add electric range field
                }
            },
            { $sort: { count: -1 } }, // Sort by model count in descending order
            { $limit: 10 }             // Limit to top 10 models
        ]);

        // Format the data as "model : range"
        const formattedData = data.map(item => {
            return {
                model: item._id,
                range: item.electricRange
            };
        });

        res.json(formattedData);
    } catch (error) {
        res.status(500).send(error);
    }
});


app.get('/data/aggregated_type', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.aggregate([
            { $group: { _id: "$Electric Vehicle Type", count: { $sum: 1 } } }
        ]);
        res.json(data);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/data_with_location', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.find();  // Limit to 100 records for performance

        // Transform the data to return only city, latitude, and longitude
        const transformedData = data.map(record => {
            const vehicleLocation = record['Vehicle Location'];

            // Check if vehicleLocation is in the correct format and extract the coordinates
            if (vehicleLocation && vehicleLocation.startsWith('POINT')) {
                // Extract the coordinates from the POINT format
                const coordinates = vehicleLocation
                    .replace('POINT (', '')  // Remove "POINT ("
                    .replace(')', '')        // Remove closing ")"
                    .split(' ');             // Split by space

                const longitude = parseFloat(coordinates[0]);
                const latitude = parseFloat(coordinates[1]);

                return {
                    city: record.City,
                    latitude,
                    longitude
                };
            } else {
                return { city: record.City };  // Return city if location is not available
            }
        });

        res.json(transformedData);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error retrieving data');
    }
});

app.get('/data/cafv', async (req, res) => {
    try {
        const data = await ElectricVehicleUSA.find({
            "Clean Alternative Fuel Vehicle (CAFV) Eligibility": "Clean Alternative Fuel Vehicle Eligible"
        });

        // Format the data to return essential fields
        const formattedData = data.map(record => {
            return {
                make: record.Make,
                model: record.Model,
                cafvEligibility: record['Clean Alternative Fuel Vehicle (CAFV) Eligibility']
            };
        });

        res.json(formattedData);
    } catch (error) {
        res.status(500).send(error);
    }
});




app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});
