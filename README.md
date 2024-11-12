# ReInHerit Strike-a-pose

**ReInHerit Strike-a-pose** is a web application that is part of the **ReInHerit Toolkit**. The application uses gamification to engage museum visitors by challenging them to replicate human poses from famous paintings or statues. The experience culminates in a video that can be shared on social media, showcasing the user's interaction with the museum's collection.

![ReInHerit Strike-a-pose logo](Strike-a-pose_logo.jpg "ReInHerit Strike-a-pose logo")

This app won a Best Demo Honorable Mention award at ACM Multimedia 2022, the foremost conference on multimedia.

1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Installation and Setup](#installation-and-setup)
   - [Email Setup](#email-setup)
   - [Flask Secret Key Setup](#flask-secret-key-setup)
   - [Server and Privacy Policy URLs](#server-and-privacy-policy-urls)
   - [Superuser Creation](#superuser-creation)
4. [Docker Setup](#docker-setup)
5. [Accessing the Application](#accessing-the-application)
6. [Admin User Management](#admin-user-management)
7. [Managing Artworks](#managing-artworks)
8. [How to Play](#how-to-play)
9. [Citation](#citation)
10. [Acknowledgements](#acknowledgements)

## Features
- **Gamification**: Engages users by challenging them to replicate poses from famous artworks.
- **Video Generation**: Allows users to generate a video of their pose-matching experience for social sharing.
- **Cultural Enrichment**: Provides information about the artworks, enhancing the museum experience.

## Prerequisites
To run this demo, ensure the following software is installed on your computer:
- [Docker](https://docs.docker.com/get-docker/)
- Python 3.10 (or higher)
## Installation and Setup
### Email Setup
To enable email notifications for users, the system must be configured with a valid Gmail account. Follow these steps:

1. Generate an App Password by following the instructions provided in this [guide](https://www.interviewqs.com/blog/py-email).
2. Once you have the App Password, open the `back-end/.env_template` file.
3. Enter your Gmail address and the generated App Password in the appropriate fields.
4. Rename the `.env_template` file to `.env` by removing the `_template` suffix. This `.env` file will be used by the application to authenticate with the email service.

### Flask Secret Key Setup
Generate a secret key for the Flask application:

1. Open a console and navigate to the `strike-a-pose/back-end/static/utility/` directory.
2. Run the following command:
    ```
    python generate_secret_key.py
    ```
3. Copy the generated key and paste it into the .env file under the SECRET_KEY variable.
### Server and Privacy Policy URLs
Set the server and privacy policy URLs in the .env file:
- **SERVER_URL**: The URL where the application is running.
- **PRIVACY_POLICY_URL**: The URL of the privacy policy.

For local or Docker setups:
``` 
SERVER_URL=http://localhost:8000
PRIVACY_POLICY_URL=http://localhost:8000/policy
```

### Superuser Creation
To manage the database, a superuser is initially required. Follow these steps for superuser generation:
1) Open `back-end/superuser.py` IDE, and set the superuser credentials with your desired username, email, and password.: 
    ```
    superuser = User(
            username='superadmin',
            email='superadmin@example.com',  # Set a unique and non-null email
            is_superuser=True,
            registered=True,  
            confirmed=True,  
        )
    superuser.set_password('superadminpassword')
    ```
2) In the console navigate to `back-end/` and run:
    ```
    python superuser.py
    ```
The superuser can:
- Add or delete artworks
- Manage admin user registrations


## Docker setup

Ensure the **.env** file is correctly configured and added to **.dockerignore** and **.gitignore**. Then:
1. Build the docker image:
    ```
    docker build -t strike . 
    ```
2. Run the Docker container:
    ```
    docker run --env-file=back-end/.env -p 8000:8000 strike  
    ```
## Accessing the Application
Once the application is running, open your web browser and go to http://localhost:8000.

## Admin User Management
To create a new admin user:

1. Go to the admin page by clicking on the ADMIN button in the top-right corner.
2. Sign up and confirm your email.
3. Wait for the superuser to approve your registration.

Admin users can:
- Add or delete artworks from the database
### Managing Artworks
To manage the artworks:
1. Log in to the admin page with your credentials.
2. You can now:
   - **Add**: Upload new artworks and fill in the necessary details.
   - **Edit**: Modify existing artwork details.
   - **Delete**: Remove artworks from the database.

### How to Play
1. Visit http://localhost:8000 

2. accept the privacy policy. 

3. Choose the challenge settings (number of poses, difficulty level).

4. Start the game and match the poses.

5. Enter your email to receive a video of your performance.

## Compatibility
The application has been tested on the following mobile operating systems: Android (since v. 13) and iOS (up to 18.1), using the default browsers of each OS (i.e. Chrome and Safari).
The app has been tested also on Windows with Edge, Chrome, Firefox browsers, and on macOS using Chrome and Firefox browsers.
Compatibility with Safari on iOS/macOS depends on the interaction with Ad-blockers, which may block the functionality of the app. For this reason the default setup will warn users about this issue.



## Citation

If you use this software in your work please cite:

```
@inproceedings{acmmm-22,
	author = {Donadio, Maria Giovanna and Principi, Filippo and Ferracani, Andrea and Bertini, Marco and Del Bimbo, Alberto},
	booktitle = {Proc. of ACM International Conference on Multimedia (ACM MM)},
	doi = {10.1145/3503161.3547744},
	isbn = {9781450392037},
	keywords = {gamification, face pose, cultural heritage, body pose},
	location = {Lisboa, Portugal},
	numpages = {3},
	pages = {7000--7002},
	publisher = {Association for Computing Machinery},
	series = {MM '22},
	title = {Engaging Museum Visitors with Gamification of Body and Facial Expressions},
	url = {https://doi.org/10.1145/3503161.3547744},
	year = {2022},
	bdsk-url-1 = {https://doi.org/10.1145/3503161.3547744}
}
```

## Acknowledgements
This work was partially supported by the European Commission under European Horizon 2020 Programme, grant number 101004545 - [ReInHerit](https://www.reinherit.eu).