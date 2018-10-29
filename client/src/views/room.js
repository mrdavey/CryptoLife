import React, { Component } from "react"
import { connect } from "react-redux"
import { Row, Col, Card, Button, Spin, message } from "antd"

import getBookingsInstance from "../contracts/bookings.js"
import { getWeb3 } from "../contracts/web3.js"
import { toHex } from "../../../lib/sign"

class RoomView extends Component {
	constructor(props) {
		super(props)
		this.Bookings = getBookingsInstance()
		this.state = {
			canCheckIn: false,
			canCheckOut: false,
			loading: false,
			emittablePayload: null
		}
	}

	componentDidMount() {
		this.fetchCanCheckIn()
		this.fetchCanCheckOut()

		// INIT AUDIO EMITTER
		Quiet.addReadyCallback(() => {
			// SENDER
			this.transmit = Quiet.transmitter({
				profile: "audible",
				// profile: "ultrasonic-experimental",
				onFinish: () => console.log("sent"),
				clampFrame: false
			})
		}, err => {
			console.log("ERR", err)
		})
	}

	fetchCanCheckIn() {
		return this.Bookings.methods.canCheckIn().call({ from: this.props.accounts[0] })
			.then(result => this.setState({ canCheckIn: result }))
			.catch(err => {
				this.setState({ canCheckIn: false })
				message.error("Unable to check the status")
			})
	}

	fetchCanCheckOut() {
		return this.Bookings.methods.checkedInGuest().call({ from: this.props.accounts[0] })
			.then(addr => this.setState({ canCheckOut: addr == this.props.accounts[0] }))
			.catch(err => {
				this.setState({ canCheckOut: false })
				message.error("Unable to check the status")
			})
	}

	onCheckIn() {
		this.setState({ loading: true })

		return this.Bookings.methods.deposit().call().then(value => {
			return this.Bookings.methods.checkIn()
				.send({ from: this.props.accounts[0], value })
		})
			.then(tx => {
				this.setState({ loading: false })

				message.success("Your room is ready! Do you want to get in?")
				this.fetchCanCheckIn()
			}).catch(err => {
				this.setState({ loading: false })
				message.warn("The transaction could not be completed")
				console.error(err)
			})
	}

	onCheckOut() {
		this.setState({ loading: true })

		return this.Bookings.methods.checkOut()
			.send({ from: this.props.accounts[0] })
			.then(tx => {
				this.setState({ loading: false })

				message.success("See you soon!")
				this.props.history.replace("/")
			}).catch(err => {
				this.setState({ loading: false })
				message.warn("The transaction could not be completed")
				console.error(err)
			})
	}

	onOpen() {
		const web3 = getWeb3()
		const timestamp = String(Date.now())

		this.setState({ loading: true })

		web3.eth.getAccounts()
			.then(accounts => {
				return new Promise((resolve) => {
					// whchever works
					// web3.eth.sign('0x' + toHex(timestamp), accounts[0]).then(resolve)
					web3.eth.personal.sign('0x' + toHex(timestamp), accounts[0]).then(resolve)
				})
			})
			.then(signature => fetch("https://dhotel-server.herokuapp.com/access/request", {
				method: 'POST',
				body: JSON.stringify({ timestamp, signature }),
				headers: {
					'Content-Type': 'application/json'
				}
			}))
			.then(res => res.json())
			.then(response => {
				this.setState({ loading: false })

				if (response && response.ok) {
					message.success("Opening the door...")

					// EMIT SOUND
					const payload = JSON.stringify(response)
					this.setState({ emittablePayload: payload })
					this.transmit.transmit(Quiet.str2ab(payload))
				}
				else message.error("You are not authorized to enter the room")
			})
			.catch(error => {
				this.setState({ loading: false })
				message.error('Error:' + error.message)
			})
	}

	onReplay() {
		if (!this.state.emittablePayload) return
		this.transmit.transmit(Quiet.str2ab(this.state.emittablePayload))
	}

	renderCheckIn() {
		return <div>
			<Card>
				You may check in now
			</Card>
			<Button type="primary" size="large" className="width-100 margin-top" onClick={() => this.onCheckIn()}>Check in</Button>
			<Button size="large" className="width-100 margin-top" onClick={() => this.props.history.goBack()}>Go back</Button>
		</div>
	}

	renderAccessCheckout() {
		return <div>
			<Card>
				You are checked in to the room
			</Card>
			{
				this.state.emittablePayload ?
					<Button size="large" type="primary" className="width-100 margin-top" onClick={() => this.onReplay()}>Try again</Button> :
					<Button size="large" type="primary" className="width-100 margin-top" onClick={() => this.onOpen()}>Unlock the door</Button>
			}
			<Button size="large" type="danger" className="width-100 margin-top" onClick={() => this.onCheckOut()}>Check Out</Button>
			<Button size="large" className="width-100 margin-top" onClick={() => this.props.history.goBack()}>Go back</Button>
		</div>
	}

	renderStale() {
		return <div>
			<Button size="large" className="width-100" onClick={() => this.props.history.goBack()}>Go back</Button>
		</div>
	}

	renderBody() {
		if (this.state.canCheckIn) return this.renderCheckIn()
		else if (this.state.canCheckOut) return this.renderAccessCheckout()
		return this.renderStale()
	}

	render() {
		return <div id="room">
			<Row>
				<Col>
					<p className="margin-top white">Welcome to the check-in desk</p>
				</Col>
			</Row>

			{
				this.renderBody()
			}

			{
				this.state.loading ?
					<p className="margin-top white">Please wait... <Spin /></p> : null
			}
		</div>
	}
}

export default connect(({ accounts }) => ({ accounts }))(RoomView)
